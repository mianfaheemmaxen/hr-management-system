import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logFineEvent } from "@/lib/audit-logger";

// DELETE fine
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super_admin can delete fines
    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get fine details before deletion for logging
    const fine = await prisma.fine.findUnique({
      where: { id },
      include: { employee: { include: { user: true } } },
    });

    await prisma.fine.delete({
      where: { id },
    });

    // Log fine deletion
    if (fine) {
      await logFineEvent({
        action: "DELETE",
        userId: session.user.id,
        userName: `${session.user.firstName} ${session.user.lastName}`,
        userEmail: session.user.email,
        fineId: id,
        employeeName: `${fine.employee.user.firstName} ${fine.employee.user.lastName}`,
        amount: fine.amount,
        oldValue: {
          date: fine.date.toISOString().split("T")[0],
          type: fine.type,
          reason: fine.reason,
          amount: fine.amount,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fine:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
