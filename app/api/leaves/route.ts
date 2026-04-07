import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET leave requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    // Role-based filtering
    const userRole = session.user.role;
    const userEmployeeId = session.user.employeeId;

    if (userRole === "employee") {
      // Employees can only see their own leave requests
      where.employeeId = userEmployeeId;
    } else if (userRole === "manager") {
      // Managers can see leave requests from employees in their department
      // First, get the manager's employee record to find their department
      const managerEmployee = await prisma.employee.findUnique({
        where: { id: userEmployeeId || undefined },
        select: { departmentId: true },
      });

      if (managerEmployee?.departmentId) {
        // Get all employees in the same department
        const departmentEmployees = await prisma.employee.findMany({
          where: { departmentId: managerEmployee.departmentId },
          select: { id: true },
        });

        const employeeIds = departmentEmployees.map((e) => e.id);
        where.employeeId = { in: employeeIds };
      }
    }
    // HR and Super Admin can see all leave requests (no additional filter)

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
            department: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const transformed = leaves.map((leave) => ({
      id: leave.id,
      employeeId: leave.employeeId,
      employeeName: `${leave.employee.user.firstName} ${leave.employee.user.lastName}`,
      department: leave.employee.department?.name || "",
      leaveType: leave.leaveType,
      startDate: leave.startDate.toISOString().split("T")[0],
      endDate: leave.endDate.toISOString().split("T")[0],
      totalDays: leave.totalDays,
      reason: leave.reason,
      status: leave.status,
      managerComment: leave.managerComment,
      managerApprovedBy: leave.managerApprovedBy,
      managerApprovedAt: leave.managerApprovedAt?.toISOString(),
      hrComment: leave.hrComment,
      hrApprovedBy: leave.hrApprovedBy,
      hrApprovedAt: leave.hrApprovedAt?.toISOString(),
      rejectedBy: leave.rejectedBy,
      rejectedAt: leave.rejectedAt?.toISOString(),
      rejectionReason: leave.rejectionReason,
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST create leave request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, leaveType, startDate, endDate, totalDays, reason } = body;

    // Validate employeeId
    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    // Verify employee exists
    const employeeExists = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employeeExists) {
      return NextResponse.json(
        { error: "Employee record not found. Please contact HR to set up your employee profile." },
        { status: 400 }
      );
    }

    // Validate date range - only allow from 30 days ago to future
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const requestStartDate = new Date(startDate);
    requestStartDate.setHours(0, 0, 0, 0);

    if (requestStartDate < thirtyDaysAgo) {
      return NextResponse.json(
        { error: "You can only apply for leave from the past 30 days onwards." },
        { status: 400 }
      );
    }

    // Check for overlapping leave requests (pending or approved)
    const overlappingLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: {
          in: ["pending", "manager_approved", "approved"]
        },
        OR: [
          {
            // New leave starts during existing leave
            AND: [
              { startDate: { lte: new Date(startDate) } },
              { endDate: { gte: new Date(startDate) } }
            ]
          },
          {
            // New leave ends during existing leave
            AND: [
              { startDate: { lte: new Date(endDate) } },
              { endDate: { gte: new Date(endDate) } }
            ]
          },
          {
            // New leave completely contains existing leave
            AND: [
              { startDate: { gte: new Date(startDate) } },
              { endDate: { lte: new Date(endDate) } }
            ]
          }
        ]
      }
    });

    if (overlappingLeaves.length > 0) {
      const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      };

      const overlap = overlappingLeaves[0];
      return NextResponse.json(
        {
          error: `You already have a ${overlap.status} leave request from ${formatDate(overlap.startDate)} to ${formatDate(overlap.endDate)}. Please cancel or wait for that request to be processed.`
        },
        { status: 400 }
      );
    }

    // Leave types that don't have their own quota (deduct from annual leave cumulatively when approved)
    const noQuotaLeaveTypes = ["half_day", "short_leave"];

    // Check leave balance (skip for unpaid leaves and no-quota types like half_day/short_leave)
    if (leaveType !== "unpaid" && !noQuotaLeaveTypes.includes(leaveType)) {
      const currentYear = new Date(startDate).getFullYear();
      const leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveType_year: {
            employeeId,
            leaveType,
            year: currentYear,
          },
        },
      });

      if (!leaveBalance) {
        return NextResponse.json(
          { error: `No leave quota assigned for ${leaveType} leave in ${currentYear}. Please contact HR.` },
          { status: 400 }
        );
      }

      if (leaveBalance.remainingDays < totalDays) {
        return NextResponse.json(
          {
            error: `Insufficient leave balance. You have ${leaveBalance.remainingDays} day(s) remaining but requested ${totalDays} day(s).`,
            remainingDays: leaveBalance.remainingDays
          },
          { status: 400 }
        );
      }
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays,
        reason,
        status: "pending",
      },
    });

    // Get employee details to find their manager and department
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        manager: {
          include: {
            user: { select: { id: true } },
          },
        },
        department: true,
      },
    });

    // Create notification for the manager
    let managerUserId = employee?.manager?.user?.id;

    if (managerUserId) {
      await prisma.notification.create({
        data: {
          userId: managerUserId,
          title: "New Leave Request",
          message: `${employee?.user.firstName} ${employee?.user.lastName} has applied for ${leaveType} leave for ${totalDays} day(s).`,
          type: "leave_request",
        },
      });
    }

    // Also notify HR users
    const hrUsers = await prisma.user.findMany({
      where: {
        role: { in: ["hr_manager", "super_admin"] },
      },
      select: { id: true },
    });

    // Create notifications for all HR users
    for (const hrUser of hrUsers) {
      await prisma.notification.create({
        data: {
          userId: hrUser.id,
          title: "New Leave Request",
          message: `${employee?.user.firstName} ${employee?.user.lastName} has applied for ${leaveType} leave for ${totalDays} day(s).`,
          type: "leave_request",
        },
      });
    }

    return NextResponse.json({ id: leave.id });
  } catch (error: any) {
    console.error("Error creating leave:", error);

    // Handle Prisma foreign key constraint error
    if (error.code === "P2003") {
      return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

