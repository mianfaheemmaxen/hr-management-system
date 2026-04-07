import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logLeaveEvent } from "@/lib/audit-logger";

// Leave types that deduct from Annual Leave cumulatively (no own quota)
const NO_QUOTA_LEAVE_TYPES: Record<string, number> = {
  half_day: 2,   // every 2 approved half_day leaves = 1 day from Annual Leave
  short_leave: 3, // every 3 approved short_leave = 1 day from Annual Leave
};

/**
 * Handles deduction logic for leave approval.
 * - Regular leave types: directly deduct from their own balance.
 * - half_day / short_leave: count approved leaves in the current year (excluding this one),
 *   determine if crossing a threshold triggers a 1-day deduction from Annual Leave.
 *   Falls back to Unpaid Leave if Annual Leave is exhausted.
 */
async function deductLeaveBalance(
  employeeId: string,
  leaveType: string,
  totalDays: number,
  startDate: Date,
  currentLeaveId: string
) {
  const leaveYear = startDate.getFullYear();

  // Standard leave types: direct deduction from own balance
  if (leaveType === "unpaid") {
    return; // No balance to deduct for unpaid
  }

  if (!NO_QUOTA_LEAVE_TYPES[leaveType]) {
    // Standard leave type - deduct directly
    await prisma.leaveBalance.updateMany({
      where: { employeeId, leaveType, year: leaveYear },
      data: {
        usedDays: { increment: totalDays },
        remainingDays: { decrement: totalDays },
      },
    });
    return;
  }

  // --- Cumulative deduction logic for half_day / short_leave ---
  const threshold = NO_QUOTA_LEAVE_TYPES[leaveType];

  // Count all previously approved leaves of this type in the same year (excluding the current leave being approved)
  const previousApprovedCount = await prisma.leaveRequest.count({
    where: {
      employeeId,
      leaveType,
      status: "approved",
      id: { not: currentLeaveId },
      startDate: {
        gte: new Date(`${leaveYear}-01-01`),
        lt: new Date(`${leaveYear + 1}-01-01`),
      },
    },
  });

  // After approving this leave, the new total count is:
  const newCount = previousApprovedCount + 1;
  const prevCount = previousApprovedCount;

  // Number of deductions already triggered before this approval
  const prevDeductions = Math.floor(prevCount / threshold);
  // Number of deductions triggered after this approval
  const newDeductions = Math.floor(newCount / threshold);

  const daysToDeduct = newDeductions - prevDeductions; // Will be 0 or 1

  if (daysToDeduct <= 0) {
    return; // No deduction triggered this time
  }

  // Try to deduct from Annual Leave first
  const annualBalance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveType_year: { employeeId, leaveType: "annual", year: leaveYear },
    },
  });

  if (annualBalance && annualBalance.remainingDays >= daysToDeduct) {
    await prisma.leaveBalance.update({
      where: { id: annualBalance.id },
      data: {
        usedDays: { increment: daysToDeduct },
        remainingDays: { decrement: daysToDeduct },
      },
    });
  } else {
    // Annual leave exhausted — fallback to Unpaid Leave
    const unpaidBalance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: { employeeId, leaveType: "unpaid", year: leaveYear },
      },
    });

    if (unpaidBalance) {
      await prisma.leaveBalance.update({
        where: { id: unpaidBalance.id },
        data: {
          usedDays: { increment: daysToDeduct },
          remainingDays: { decrement: daysToDeduct },
        },
      });
    }
    // If no unpaid balance record exists either, we still approve — just log it
  }
}

// PUT update leave request
export async function PUT(
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
    const { action, comments, deductBalance = true } = body;

    // Get the current leave request
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    const userRole = session.user.role;
    const isManager = userRole === "manager";
    const isHR = userRole === "hr_manager" || userRole === "super_admin";

    const updateData: Record<string, unknown> = {};

    if (action === "approve") {
      // Manager approval (first level)
      if (isManager && !isHR && leave.status === "pending") {
        updateData.status = "manager_approved";
        updateData.managerApprovedBy = session.user.employeeId;
        updateData.managerApprovedAt = new Date();
        updateData.managerComment = comments;
      }
      // HR approval (final level)
      else if (isHR && leave.status === "manager_approved") {
        updateData.status = "approved";
        updateData.hrApprovedBy = session.user.employeeId;
        updateData.hrApprovedAt = new Date();
        updateData.hrComment = comments;

        // Deduct leave balance (skipped if HR explicitly unchecked the option)
        if (deductBalance) {
          await deductLeaveBalance(leave.employeeId, leave.leaveType, leave.totalDays, leave.startDate, leave.id);
        }
      }
      // HR can also directly approve if they want to bypass manager approval
      else if (isHR && leave.status === "pending") {
        updateData.status = "approved";
        updateData.hrApprovedBy = session.user.employeeId;
        updateData.hrApprovedAt = new Date();
        updateData.hrComment = comments;

        // Deduct leave balance (skipped if HR explicitly unchecked the option)
        if (deductBalance) {
          await deductLeaveBalance(leave.employeeId, leave.leaveType, leave.totalDays, leave.startDate, leave.id);
        }
      } else {
        return NextResponse.json(
          { error: "You don't have permission to approve this leave request at this stage" },
          { status: 403 }
        );
      }
    } else if (action === "reject") {
      // Both manager and HR can reject
      if (isManager || isHR) {
        updateData.status = "rejected";
        updateData.rejectedBy = session.user.employeeId;
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = comments;
      } else {
        return NextResponse.json(
          { error: "You don't have permission to reject this leave request" },
          { status: 403 }
        );
      }
    }

    await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
    });

    // Create notification for the employee
    const employee = await prisma.employee.findUnique({
      where: { id: leave.employeeId },
      select: { userId: true },
    });

    if (employee) {
      let notificationTitle = "";
      let notificationMessage = "";
      let notificationType = "";

      if (action === "approve") {
        if (updateData.status === "manager_approved") {
          notificationTitle = "Leave Request Approved by Manager";
          notificationMessage = `Your leave request has been approved by your manager. Waiting for HR approval.`;
          notificationType = "leave_approved";
        } else if (updateData.status === "approved") {
          notificationTitle = "Leave Request Approved";
          notificationMessage = `Your leave request has been approved. Enjoy your time off!`;
          notificationType = "leave_approved";
        }
      } else if (action === "reject") {
        notificationTitle = "Leave Request Rejected";
        notificationMessage = `Your leave request has been rejected. ${comments ? `Reason: ${comments}` : ""}`;
        notificationType = "leave_rejected";
      }

      if (notificationTitle) {
        await prisma.notification.create({
          data: {
            userId: employee.userId,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
          },
        });
      }
    }

    // Log leave action to audit log
    const leaveEmployee = await prisma.employee.findUnique({
      where: { id: leave.employeeId },
      include: { user: true },
    });

    const actionType = action === "approve"
      ? (updateData.status === "approved" ? "APPROVE" : "UPDATE")
      : action === "reject" ? "REJECT" : "UPDATE";

    await logLeaveEvent({
      action: actionType as "APPROVE" | "REJECT" | "UPDATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      leaveId: id,
      employeeName: leaveEmployee ? `${leaveEmployee.user.firstName} ${leaveEmployee.user.lastName}` : undefined,
      leaveType: leave.leaveType,
      oldValue: { status: leave.status },
      newValue: { status: updateData.status },
      context: {
        ...(comments ? { comments } : {}),
        ...(updateData.status === "approved" ? { balanceDeducted: deductBalance } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating leave:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

