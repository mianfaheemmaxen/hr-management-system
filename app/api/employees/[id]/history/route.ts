import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET employee history
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

    // Fetch all history records for this employee
    const history = await prisma.employeeHistory.findMany({
      where: { employeeId: id },
      orderBy: { changedAt: "desc" },
    });

    // Get user info for who made the changes
    const userIds = [...new Set(history.map(h => h.changedBy))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    // Transform history with user names
    const transformedHistory = history.map(h => ({
      id: h.id,
      field: h.field,
      oldValue: h.oldValue,
      newValue: h.newValue,
      changedBy: userMap.get(h.changedBy) || "Unknown",
      changedAt: h.changedAt.toISOString(),
    }));

    return NextResponse.json(transformedHistory);
  } catch (error) {
    console.error("Error fetching employee history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}



