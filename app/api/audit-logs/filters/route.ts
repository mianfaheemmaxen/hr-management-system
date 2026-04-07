import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET filter options for audit logs
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get distinct actions
    const actions = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    });

    // Get distinct entity types
    const entityTypes = await prisma.auditLog.findMany({
      select: { entityType: true },
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
    });

    // Get users who have performed actions
    const users = await prisma.user.findMany({
      where: {
        auditLogs: { some: {} },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return NextResponse.json({
      actions: actions.map((a) => a.action),
      entityTypes: entityTypes.map((e) => e.entityType),
      users: users,
    });
  } catch (error) {
    console.error("Error fetching filter options:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

