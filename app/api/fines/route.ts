import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logFineEvent } from "@/lib/audit-logger";

// GET fines
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

    const fines = await prisma.fine.findMany({
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

    const transformed = fines.map((fine: any) => ({
      id: fine.id,
      employeeId: fine.employeeId,
      employeeName: `${fine.employee.user.firstName} ${fine.employee.user.lastName}`,
      department: fine.employee.department?.name || "",
      date: fine.date.toISOString().split("T")[0],
      type: fine.type,
      lateMinutes: fine.lateMinutes,
      reason: fine.reason,
      amount: fine.amount,
      status: fine.status,
      waiverReason: fine.waiverReason,
      createdAt: fine.createdAt.toISOString(),
      // Compensation fields
      compensationRequested: fine.compensationRequested,
      compensationReason: fine.compensationReason,
      compensationRequestedAt: fine.compensationRequestedAt?.toISOString(),
      compensationStatus: fine.compensationStatus,
      compensationApprovedBy: fine.compensationApprovedBy,
      compensationApprovedAt: fine.compensationApprovedAt?.toISOString(),
      compensationRejectionReason: fine.compensationRejectionReason,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching fines:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create fine
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
    const { employeeId, date, type, lateMinutes, reason, amount } = body;

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

      if (
        !managerEmployee ||
        !targetEmployee ||
        managerEmployee.departmentId !== targetEmployee.departmentId
      ) {
        return NextResponse.json(
          { error: "You can only add fines for employees in your department" },
          { status: 403 }
        );
      }
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    // Prevent duplicate fines for the same employee/date/type
    const existingFine = await prisma.fine.findFirst({
      where: {
        employeeId,
        date: new Date(date),
        type: type || "late_arrival",
      },
    });

    if (existingFine) {
      return NextResponse.json({ id: existingFine.id });
    }

    const fine = await prisma.fine.create({
      data: {
        employeeId,
        date: new Date(date),
        type: type || "late_arrival",
        lateMinutes: lateMinutes || 0,
        reason,
        amount,
        status: "implemented",
      },
    });

    // Log fine creation
    await logFineEvent({
      action: "CREATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      fineId: fine.id,
      employeeName: employee ? `${employee.user.firstName} ${employee.user.lastName}` : undefined,
      amount,
      newValue: { date, type: type || "late_arrival", reason, amount, lateMinutes },
    });

    return NextResponse.json({ id: fine.id });
  } catch (error) {
    console.error("Error creating fine:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
