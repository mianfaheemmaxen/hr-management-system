import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateFineAmount } from "@/lib/attendance-utils";
import { logAttendanceEvent } from "@/lib/audit-logger";

// PATCH - Update attendance record (e.g., toggle compensation)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only HR, super_admin, and managers can update compensation and intimated status
    if (!["super_admin", "hr_manager", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { isCompensated, intimated, intimatedReason } = body;

    // Await params in Next.js 15
    const { id } = await params;

    // Get the attendance record with employee info for audit log
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const employeeName = `${attendance.employee.user.firstName} ${attendance.employee.user.lastName}`;

    // Store old values for audit log
    const oldValues: any = {};
    if (isCompensated !== undefined) {
      oldValues.isCompensated = attendance.isCompensated;
    }
    if (intimated !== undefined) {
      oldValues.intimated = attendance.intimated;
      oldValues.intimatedReason = attendance.intimatedReason;
    }

    // Update the compensation and/or intimated status
    const updateData: any = {};
    if (isCompensated !== undefined) {
      updateData.isCompensated = isCompensated;
    }
    if (intimated !== undefined) {
      updateData.intimated = intimated;
      // If intimated is being set to true and a reason is provided, save it
      if (intimated === true && intimatedReason) {
        updateData.intimatedReason = intimatedReason;
      }
      // If intimated is being set to false, clear the reason
      if (intimated === false) {
        updateData.intimatedReason = null;
      }
    }

    const updatedAttendance = await prisma.attendanceRecord.update({
      where: { id },
      data: updateData,
    });

    // If compensation is set to false (No) and employee was late, create a fine
    if (isCompensated === false && attendance.status === "late" && attendance.lateMinutes > 0) {
      // Get system settings for fine rules
      const settings = await prisma.systemSettings.findUnique({
        where: { id: "default" },
      });

      if (settings) {
        const fineRules = settings.fineRules ? JSON.parse(settings.fineRules as string) : [];
        const fineAmount = calculateFineAmount(attendance.lateMinutes, fineRules);

        if (fineAmount > 0) {
          // Check if this qualifies for the 5-minute grace period (first 3 times per month)
          let shouldAutoWaive = false;
          let graceCount = 0;

          if (attendance.lateMinutes > 0 && attendance.lateMinutes <= 5) {
            // Get the current month's start and end dates
            const currentDate = new Date(attendance.date);
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            // Count how many times this employee was late within 5 minutes this month (excluding this date)
            const lateWithin5MinCount = await prisma.attendanceRecord.count({
              where: {
                employeeId: attendance.employeeId,
                date: {
                  gte: monthStart,
                  lte: monthEnd,
                  not: attendance.date
                },
                status: 'late',
                lateMinutes: {
                  gt: 0,
                  lte: 5
                }
              }
            });

            // If this is one of the first 3 times, auto-waive the fine
            if (lateWithin5MinCount < 3) {
              shouldAutoWaive = true;
              graceCount = lateWithin5MinCount + 1;
            }
          }

          // Check if a fine already exists for this attendance record
          const existingFine = await prisma.fine.findFirst({
            where: {
              employeeId: attendance.employeeId,
              date: attendance.date,
              type: "late_arrival",
            },
          });

          if (!existingFine) {
            // Create fine with appropriate status and waiver reason
            const fineData: any = {
              employeeId: attendance.employeeId,
              date: attendance.date,
              type: "late_arrival",
              lateMinutes: attendance.lateMinutes,
              reason: `Late arrival by ${attendance.lateMinutes} minutes`,
              amount: fineAmount,
              status: shouldAutoWaive ? "waived" : "implemented",
            };

            // Add waiver reason if auto-waiving
            if (shouldAutoWaive) {
              fineData.waiverReason = `Grace period - late within 5 minutes (${graceCount} of 3 monthly allowance)`;
            }

            await prisma.fine.create({ data: fineData });
          }
        }
      }
    }

    // If compensation is set to true (Yes), delete any existing late arrival fine for this date
    if (isCompensated === true) {
      await prisma.fine.deleteMany({
        where: {
          employeeId: attendance.employeeId,
          date: attendance.date,
          type: "late_arrival",
          status: "implemented", // Only delete implemented fines (not waived ones)
        },
      });
    }

    // Log attendance update
    await logAttendanceEvent({
      action: "UPDATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      attendanceId: id,
      employeeName,
      oldValue: oldValues,
      newValue: {
        isCompensated: updatedAttendance.isCompensated,
        intimated: updatedAttendance.intimated,
        intimatedReason: updatedAttendance.intimatedReason,
      },
      context: {
        date: attendance.date.toISOString().split('T')[0],
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
      },
    });

    return NextResponse.json(updatedAttendance);
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

