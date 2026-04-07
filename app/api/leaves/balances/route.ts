import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET leave balances for employees
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    // Get all employees or specific employee
    const where: any = {};
    if (employeeId) {
      where.id = employeeId;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Calculate leave balances for each employee
    const currentYear = new Date().getFullYear();
    const balances = await Promise.all(
      employees.map(async (employee) => {
        // Get all approved leaves for current year
        const leaves = await prisma.leaveRequest.findMany({
          where: {
            employeeId: employee.id,
            status: "approved",
            startDate: {
              gte: new Date(`${currentYear}-01-01`),
              lte: new Date(`${currentYear}-12-31`),
            },
          },
        });

        // Calculate used days by leave type
        const usedDays: Record<string, number> = {};
        leaves.forEach((leave) => {
          if (!usedDays[leave.leaveType]) {
            usedDays[leave.leaveType] = 0;
          }
          usedDays[leave.leaveType] += leave.totalDays;
        });

        // Default leave allocations (you can make this configurable)
        const allocations = {
          annual: 20,
          sick: 10,
          casual: 5,
          unpaid: 0,
        };

        return {
          employeeId: employee.id,
          employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
          year: currentYear,
          balances: Object.entries(allocations).map(([type, total]) => ({
            leaveType: type,
            total,
            used: usedDays[type] || 0,
            remaining: total - (usedDays[type] || 0),
          })),
        };
      })
    );

    return NextResponse.json(balances);
  } catch (error) {
    console.error("Error fetching leave balances:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

