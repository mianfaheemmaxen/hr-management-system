import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET leave balance history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const year = searchParams.get("year");

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (year) {
      where.year = parseInt(year);
    }

    // Get historical data
    const history = await prisma.leaveBalanceHistory.findMany({
      where,
      orderBy: [
        { year: "desc" },
        { leaveType: "asc" }
      ]
    });

    // Get current year data
    const currentYear = new Date().getFullYear();
    const currentBalances = await prisma.leaveBalance.findMany({
      where: employeeId ? { employeeId } : {},
      orderBy: [
        { year: "desc" },
        { leaveType: "asc" }
      ]
    });

    // Combine and organize by year
    const allData = [
      ...history.map(h => ({
        employeeId: h.employeeId,
        leaveType: h.leaveType,
        year: h.year,
        totalDays: h.totalDays,
        usedDays: h.usedDays,
        remainingDays: h.remainingDays,
        isArchived: true,
        archivedAt: h.archivedAt
      })),
      ...currentBalances.map(b => ({
        employeeId: b.employeeId,
        leaveType: b.leaveType,
        year: b.year,
        totalDays: b.totalDays,
        usedDays: b.usedDays,
        remainingDays: b.remainingDays,
        isArchived: false,
        updatedAt: b.updatedAt
      }))
    ];

    // Group by year
    const groupedByYear: Record<number, any[]> = {};
    allData.forEach(item => {
      if (!groupedByYear[item.year]) {
        groupedByYear[item.year] = [];
      }
      groupedByYear[item.year].push(item);
    });

    // Get available years
    const years = Object.keys(groupedByYear).map(y => parseInt(y)).sort((a, b) => b - a);

    return NextResponse.json({
      years,
      data: groupedByYear,
      currentYear
    });
  } catch (error) {
    console.error("Error fetching leave balance history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}