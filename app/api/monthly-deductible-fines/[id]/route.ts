import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET single monthly deductible fine by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const record = await prisma.monthlyDeductibleFine.findUnique({
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

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: record.id,
      employeeId: record.employeeId,
      employeeName: `${record.employee.user.firstName} ${record.employee.user.lastName}`,
      month: record.month,
      year: record.year,
      actualAmount: record.actualAmount,
      deductibleAmount: record.deductibleAmount,
      finalDeductibleAmount: record.finalDeductibleAmount,
      multiplier: record.multiplier,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching monthly deductible fine:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT update single record (typically for updating finalDeductibleAmount)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    const allowedRoles = ["super_admin", "hr_manager"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { finalDeductibleAmount } = body;

    if (finalDeductibleAmount === undefined) {
      return NextResponse.json({ error: "finalDeductibleAmount is required" }, { status: 400 });
    }

    const record = await prisma.monthlyDeductibleFine.update({
      where: { id },
      data: { finalDeductibleAmount },
    });

    return NextResponse.json({
      id: record.id,
      employeeId: record.employeeId,
      finalDeductibleAmount: record.finalDeductibleAmount,
      updatedAt: record.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating monthly deductible fine:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE a record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    const allowedRoles = ["super_admin", "hr_manager"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.monthlyDeductibleFine.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting monthly deductible fine:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

