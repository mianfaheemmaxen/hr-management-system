import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logLeaveBalanceEvent } from "@/lib/audit-logger";

// GET leave balances
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    let whereClause: any = { year: parseInt(year) };

    // If employeeId is provided, filter by that employee
    if (employeeId) {
      whereClause.employeeId = employeeId;
    } else if (session.user.role === "employee") {
      // Regular employees can only see their own balance
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (employee) {
        whereClause.employeeId = employee.id;
      }
    } else if (session.user.role === "manager") {
      // Managers can see their department's balances
      const managerEmployee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
        select: { departmentId: true },
      });

      if (managerEmployee?.departmentId) {
        const departmentEmployees = await prisma.employee.findMany({
          where: { departmentId: managerEmployee.departmentId },
          select: { id: true },
        });
        whereClause.employeeId = {
          in: departmentEmployees.map((e) => e.id),
        };
      }
    }
    // HR and Super Admin see all balances (no additional filtering)

    const balances = await prisma.leaveBalance.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ employeeId: "asc" }, { leaveType: "asc" }],
    });

    // Transform to match frontend expectations
    const transformed = balances.map((balance) => ({
      id: balance.id,
      employeeId: balance.employeeId,
      employeeName: `${balance.employee.user.firstName} ${balance.employee.user.lastName}`,
      department: balance.employee.department?.name || "",
      leaveType: balance.leaveType,
      year: balance.year,
      totalDays: balance.totalDays,
      usedDays: balance.usedDays,
      remainingDays: balance.remainingDays,
      createdAt: balance.createdAt.toISOString(),
      updatedAt: balance.updatedAt.toISOString(),
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching leave balances:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST create or update leave balance
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, leaveType, year, totalDays, addToExisting } = body;

    // Get employee name for audit log
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const employeeName = `${employee.user.firstName} ${employee.user.lastName}`;

    // Check if balance already exists
    const existingBalance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId,
          leaveType,
          year: parseInt(year),
        },
      },
    });

    if (existingBalance) {
      // Update existing balance
      let newTotalDays: number;
      let newRemainingDays: number;

      if (addToExisting) {
        // ADD to existing balance
        newTotalDays = existingBalance.totalDays + parseInt(totalDays);
        newRemainingDays = existingBalance.remainingDays + parseInt(totalDays);
        console.log(`[LEAVE BALANCE] Adding ${totalDays} days to existing ${existingBalance.totalDays} days = ${newTotalDays} total`);
      } else {
        // REPLACE existing balance
        newTotalDays = parseInt(totalDays);
        newRemainingDays = parseInt(totalDays) - existingBalance.usedDays;
        console.log(`[LEAVE BALANCE] Replacing ${existingBalance.totalDays} days with ${totalDays} days`);
      }

      const updated = await prisma.leaveBalance.update({
        where: { id: existingBalance.id },
        data: {
          totalDays: newTotalDays,
          remainingDays: newRemainingDays,
        },
      });

      // Log leave balance update
      await logLeaveBalanceEvent({
        action: "UPDATE",
        userId: session.user.id,
        userName: `${session.user.firstName} ${session.user.lastName}`,
        userEmail: session.user.email,
        leaveBalanceId: updated.id,
        employeeName,
        oldValue: {
          totalDays: existingBalance.totalDays,
          remainingDays: existingBalance.remainingDays,
        },
        newValue: {
          totalDays: newTotalDays,
          remainingDays: newRemainingDays,
        },
        context: {
          leaveType,
          year,
          operation: addToExisting ? "add" : "replace",
          daysAdded: addToExisting ? parseInt(totalDays) : null,
        },
      });

      return NextResponse.json({
        id: updated.id,
        message: addToExisting
          ? `Added ${totalDays} days to existing balance`
          : "Leave balance replaced",
        operation: addToExisting ? "add" : "replace",
        oldTotal: existingBalance.totalDays,
        newTotal: newTotalDays,
      });
    } else {
      // Create new balance
      const balance = await prisma.leaveBalance.create({
        data: {
          employeeId,
          leaveType,
          year: parseInt(year),
          totalDays: parseInt(totalDays),
          usedDays: 0,
          remainingDays: parseInt(totalDays),
        },
      });

      // Log leave balance creation
      await logLeaveBalanceEvent({
        action: "CREATE",
        userId: session.user.id,
        userName: `${session.user.firstName} ${session.user.lastName}`,
        userEmail: session.user.email,
        leaveBalanceId: balance.id,
        employeeName,
        context: {
          leaveType,
          year,
          totalDays: parseInt(totalDays),
        },
      });

      return NextResponse.json({
        id: balance.id,
        message: "Leave balance created",
        operation: "create",
        newTotal: parseInt(totalDays),
      });
    }
  } catch (error) {
    console.error("Error creating/updating leave balance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

