import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET monthly deductible fines
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const employeeId = searchParams.get("employeeId");

    const where: Record<string, unknown> = {};

    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (employeeId) where.employeeId = employeeId;

    const records = await prisma.monthlyDeductibleFine.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const transformed = records.map((record: any) => ({
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
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching monthly deductible fines:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST create or update monthly deductible fines (upsert)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions - only super_admin and hr_manager can save fine reports
    const allowedRoles = ["super_admin", "hr_manager"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Records array is required" }, { status: 400 });
    }

    // Upsert all records
    const results = await Promise.all(
      records.map(async (record: any) => {
        const { employeeId, month, year, actualAmount, deductibleAmount, finalDeductibleAmount, multiplier } = record;

        return prisma.monthlyDeductibleFine.upsert({
          where: {
            employeeId_month_year: {
              employeeId,
              month,
              year,
            },
          },
          update: {
            actualAmount,
            deductibleAmount,
            finalDeductibleAmount,
            multiplier,
          },
          create: {
            employeeId,
            month,
            year,
            actualAmount,
            deductibleAmount,
            finalDeductibleAmount,
            multiplier,
          },
        });
      })
    );

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error("Error saving monthly deductible fines:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

