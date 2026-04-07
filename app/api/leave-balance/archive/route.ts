import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST - Archive current year leave balances (run at year end)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { year } = body;

    if (!year) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 });
    }

    // Get all leave balances for the specified year
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: { year: parseInt(year) }
    });

    if (leaveBalances.length === 0) {
      return NextResponse.json({ 
        message: "No leave balances found for this year",
        archived: 0 
      });
    }

    // Archive them
    const archiveData = leaveBalances.map(balance => ({
      employeeId: balance.employeeId,
      leaveType: balance.leaveType,
      year: balance.year,
      totalDays: balance.totalDays,
      usedDays: balance.usedDays,
      remainingDays: balance.remainingDays
    }));

    await prisma.leaveBalanceHistory.createMany({
      data: archiveData,
      skipDuplicates: true
    });

    return NextResponse.json({ 
      message: `Successfully archived ${leaveBalances.length} leave balance records for year ${year}`,
      archived: leaveBalances.length
    });
  } catch (error) {
    console.error("Error archiving leave balances:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

