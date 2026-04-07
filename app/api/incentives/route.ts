import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logIncentiveEvent } from "@/lib/audit-logger";

// GET incentives
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) {
      where.month = parseInt(month);
    }

    if (year) {
      where.year = parseInt(year);
    }

    const incentives = await prisma.incentive.findMany({
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

    const transformed = incentives.map((incentive) => ({
      id: incentive.id,
      employeeId: incentive.employeeId,
      employeeName: `${incentive.employee.user.firstName} ${incentive.employee.user.lastName}`,
      department: incentive.employee.department?.name || "",
      month: incentive.month,
      year: incentive.year,
      type: incentive.type,
      amount: incentive.amount,
      description: incentive.description,
      awardedBy: incentive.awardedBy,
      createdAt: incentive.createdAt.toISOString(),
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching incentives:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST create incentive
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    const allowedRoles = ["super_admin", "hr_manager", "manager"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, month, year, type, amount, description } = body;

    // If manager, verify the employee is in their department
    if (session.user.role === "manager") {
      const managerEmployee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
        select: { departmentId: true },
      });

      const targetEmployee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { departmentId: true },
      });

      if (!managerEmployee || !targetEmployee || managerEmployee.departmentId !== targetEmployee.departmentId) {
        return NextResponse.json({ error: "You can only add incentives for employees in your department" }, { status: 403 });
      }
    }

    const incentive = await prisma.incentive.create({
      data: {
        employeeId,
        month,
        year,
        type,
        amount,
        description,
        awardedBy: session.user.id,
      },
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

    // Log incentive creation
    await logIncentiveEvent({
      action: "CREATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      incentiveId: incentive.id,
      employeeName: `${incentive.employee.user.firstName} ${incentive.employee.user.lastName}`,
      amount,
      context: {
        type,
        month,
        year,
        description,
      },
    });

    return NextResponse.json({ id: incentive.id });
  } catch (error) {
    console.error("Error creating incentive:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

