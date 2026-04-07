import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST - Employee requests compensation for a fine
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    // Get the fine
    const fine = await prisma.fine.findUnique({
      where: { id },
      include: { employee: { include: { user: true } } },
    });

    if (!fine) {
      return NextResponse.json({ error: "Fine not found" }, { status: 404 });
    }

    // Verify the employee owns this fine (or is admin)
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (session.user.role === "employee" && (!employee || employee.id !== fine.employeeId)) {
      return NextResponse.json({ error: "You can only request compensation for your own fines" }, { status: 403 });
    }

    // Check if compensation already requested
    if (fine.compensationRequested) {
      return NextResponse.json({ error: "Compensation already requested for this fine" }, { status: 400 });
    }

    // Check if fine is already waived
    if (fine.status === "waived") {
      return NextResponse.json({ error: "Cannot request compensation for waived fines" }, { status: 400 });
    }

    // Update fine with compensation request
    const updatedFine = await prisma.fine.update({
      where: { id },
      data: {
        compensationRequested: true,
        compensationReason: reason.trim(),
        compensationRequestedAt: new Date(),
        compensationStatus: "pending",
      },
    });

    // Notify all super_admins
    const superAdmins = await prisma.user.findMany({
      where: { role: "super_admin" },
    });

    const employeeName = `${fine.employee.user?.firstName || ""} ${fine.employee.user?.lastName || ""}`.trim() || "Employee";

    for (const admin of superAdmins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Fine Compensation Request",
          message: `${employeeName} has requested compensation for a fine of Rs.${fine.amount}. Reason: ${reason.trim().substring(0, 100)}...`,
          type: "fine",
        },
      });
    }

    return NextResponse.json({ success: true, fine: updatedFine });
  } catch (error) {
    console.error("Error requesting compensation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Super admin approves/rejects compensation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super_admin can approve/reject
    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admin can approve/reject compensation requests" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, rejectionReason } = body; // action: 'approve' or 'reject'

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const fine = await prisma.fine.findUnique({
      where: { id },
      include: { employee: { include: { user: true } } },
    });

    if (!fine) {
      return NextResponse.json({ error: "Fine not found" }, { status: 404 });
    }

    if (!fine.compensationRequested || fine.compensationStatus !== "pending") {
      return NextResponse.json({ error: "No pending compensation request for this fine" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      compensationStatus: action === "approve" ? "approved" : "rejected",
      compensationApprovedBy: session.user.id,
      compensationApprovedAt: new Date(),
    };

    if (action === "approve") {
      updateData.status = "waived";
    } else {
      // Only set rejection reason if provided
      if (rejectionReason && rejectionReason.trim().length > 0) {
        updateData.compensationRejectionReason = rejectionReason.trim();
      }
    }

    const updatedFine = await prisma.fine.update({
      where: { id },
      data: updateData,
    });

    // Notify the employee
    if (fine.employee.user) {
      const rejectionMessage = action === "reject" && rejectionReason && rejectionReason.trim().length > 0
        ? ` Reason: ${rejectionReason}`
        : "";

      await prisma.notification.create({
        data: {
          userId: fine.employee.user.id,
          title: action === "approve" ? "Compensation Approved" : "Compensation Rejected",
          message: action === "approve"
            ? `Your compensation request for fine of Rs.${fine.amount} has been approved. The fine has been waived.`
            : `Your compensation request for fine of Rs.${fine.amount} has been rejected.${rejectionMessage}`,
          type: "fine",
        },
      });
    }

    return NextResponse.json({ success: true, fine: updatedFine });
  } catch (error) {
    console.error("Error processing compensation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

