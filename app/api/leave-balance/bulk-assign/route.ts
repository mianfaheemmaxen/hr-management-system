import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logLeaveBalanceEvent } from "@/lib/audit-logger";

// POST bulk assign leave quotas to all permanent employees
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized. Only Super Admin can perform this action." }, { status: 401 });
    }

    const body = await request.json();
    const { year } = body;

    if (!year) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 });
    }

    // Get system settings for default quotas
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      return NextResponse.json({ error: "System settings not found" }, { status: 404 });
    }

    // Get all permanent employees
    const permanentEmployees = await prisma.employee.findMany({
      where: {
        employmentStatus: "permanent",
        status: "active",
      },
      select: {
        id: true,
      },
    });

    if (permanentEmployees.length === 0) {
      return NextResponse.json({ 
        message: "No permanent employees found",
        assigned: 0,
        skipped: 0,
      });
    }

    // Define leave types and their quotas from settings
    const allLeaveTypes = [
      { type: "sick", quota: settings.sickLeaveQuota },
      { type: "annual", quota: settings.annualLeaveQuota },
      { type: "complementary", quota: settings.complementaryLeaveQuota },
      { type: "unpaid", quota: settings.unpaidLeaveQuota },
      { type: "maternity", quota: settings.maternityLeaveQuota },
      { type: "umrah", quota: settings.umrahLeaveQuota },
    ];

    // Filter out leave types with 0 quota (disabled leave types)
    const leaveTypes = allLeaveTypes.filter(lt => lt.quota > 0);

    console.log(`[Bulk Assign] Active leave types (quota > 0):`, leaveTypes.map(lt => `${lt.type}=${lt.quota}`).join(', '));

    let assignedCount = 0;
    let skippedCount = 0;

    // For each permanent employee, assign all active leave types
    for (const employee of permanentEmployees) {
      for (const { type, quota } of leaveTypes) {
        // Check if balance already exists
        const existing = await prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveType_year: {
              employeeId: employee.id,
              leaveType: type,
              year: parseInt(year),
            },
          },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        // Create new leave balance
        await prisma.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveType: type,
            year: parseInt(year),
            totalDays: quota,
            usedDays: 0,
            remainingDays: quota,
          },
        });

        assignedCount++;
      }
    }

    // Log bulk assignment
    await logLeaveBalanceEvent({
      action: "BULK_CREATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      context: {
        year: parseInt(year),
        employeesProcessed: permanentEmployees.length,
        assignedCount,
        skippedCount,
        leaveTypes: leaveTypes.map(lt => `${lt.type}=${lt.quota}`).join(', '),
      },
    });

    return NextResponse.json({
      message: `Successfully assigned leave quotas to ${permanentEmployees.length} permanent employees`,
      assigned: assignedCount,
      skipped: skippedCount,
      employeesProcessed: permanentEmployees.length,
    });
  } catch (error) {
    console.error("Error bulk assigning leave quotas:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

