import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET daily attendance report
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["super_admin", "hr_manager", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Use provided date or today
    // Parse the date string to get the date in the user's timezone
    let targetDate: Date;
    if (dateParam) {
      // If date is provided as YYYY-MM-DD, parse it as UTC midnight
      targetDate = new Date(dateParam + 'T00:00:00.000Z');
    } else {
      // For "today", use current date in UTC
      const now = new Date();
      targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }

    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    // Get all active employees
    const allEmployees = await prisma.employee.findMany({
      where: {
        user: {
          isActive: true
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        department: {
          select: {
            name: true
          }
        }
      }
    });

    // Get attendance records for the date
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: targetDate,
          lt: nextDay
        }
      }
    });

    // Get approved leave requests for the date
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: "approved",
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            },
            department: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Get pending leave requests for the date
    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: {
          in: ["pending", "manager_approved"]
        },
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            },
            department: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Create maps for quick lookup
    const attendanceMap = new Map(attendanceRecords.map(a => [a.employeeId, a]));
    const approvedLeaveMap = new Map(approvedLeaves.map(l => [l.employeeId, l]));
    const pendingLeaveMap = new Map(pendingLeaves.map(l => [l.employeeId, l]));

    // Categorize employees
    const onApprovedLeave: any[] = [];
    const absentWithoutLeave: any[] = [];
    const withPendingLeave: any[] = [];

    allEmployees.forEach(employee => {
      const attendance = attendanceMap.get(employee.id);
      const approvedLeave = approvedLeaveMap.get(employee.id);
      const pendingLeave = pendingLeaveMap.get(employee.id);

      const employeeData = {
        id: employee.id,
        name: `${employee.user.firstName} ${employee.user.lastName}`,
        email: employee.user.email,
        department: employee.department?.name || "N/A",
        designation: employee.designation || "N/A"
      };

      // Category 1: On approved leave
      if (approvedLeave) {
        onApprovedLeave.push({
          ...employeeData,
          leaveType: approvedLeave.leaveType,
          leaveStartDate: approvedLeave.startDate,
          leaveEndDate: approvedLeave.endDate,
          leaveDays: approvedLeave.totalDays
        });
      }
      // Category 3: Has pending leave application
      else if (pendingLeave) {
        withPendingLeave.push({
          ...employeeData,
          leaveType: pendingLeave.leaveType,
          leaveStatus: pendingLeave.status,
          leaveStartDate: pendingLeave.startDate,
          leaveEndDate: pendingLeave.endDate,
          attendanceStatus: attendance?.status || "absent"
        });
      }
      // Category 2: Absent without leave (no attendance record and no approved leave)
      else if (!attendance || attendance.status === "absent") {
        absentWithoutLeave.push({
          ...employeeData,
          attendanceStatus: attendance?.status || "not_marked"
        });
      }
    });

    return NextResponse.json({
      date: targetDate.toISOString(),
      summary: {
        totalEmployees: allEmployees.length,
        onApprovedLeave: onApprovedLeave.length,
        absentWithoutLeave: absentWithoutLeave.length,
        withPendingLeave: withPendingLeave.length
      },
      onApprovedLeave,
      absentWithoutLeave,
      withPendingLeave
    });
  } catch (error) {
    console.error("Error fetching daily attendance report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

