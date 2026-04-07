import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT - Edit leave request (HR/Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Manager and Super Admin can edit leaves
    const canEdit =
      session.user.role === "super_admin" || session.user.role === "manager";
    if (!canEdit) {
      return NextResponse.json(
        { error: "Only Managers and System Admins can edit leave requests" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { leaveType: newLeaveType, status: newStatus, comments } = body;

    // Get the current leave request
    const currentLeave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!currentLeave) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    const oldLeaveType = currentLeave.leaveType;
    const oldStatus = currentLeave.status;
    const leaveYear = currentLeave.startDate.getFullYear();
    const totalDays = currentLeave.totalDays;

    // Track if we need to update balances
    const leaveTypeChanged = oldLeaveType !== newLeaveType;
    const statusChanged = oldStatus !== newStatus;

    // Determine if old status was "approved"
    const wasApproved = oldStatus === "approved";
    // Determine if new status is "approved"
    const isNowApproved = newStatus === "approved";

    console.log(`[EDIT LEAVE] Employee: ${currentLeave.employeeId}`);
    console.log(
      `[EDIT LEAVE] Old: ${oldLeaveType} (${oldStatus}) - ${totalDays} days`
    );
    console.log(
      `[EDIT LEAVE] New: ${newLeaveType} (${newStatus}) - ${totalDays} days`
    );
    console.log(
      `[EDIT LEAVE] Was Approved: ${wasApproved}, Is Now Approved: ${isNowApproved}`
    );

    // Leave types that deduct cumulatively from Annual Leave (no own quota)
    const noQuotaLeaveTypes = ["half_day", "short_leave"];

    // Start a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // STEP 1: Revert old leave balance if it was approved
      // Skip for unpaid and no-quota types (half_day/short_leave) - their balances are managed cumulatively
      if (wasApproved && oldLeaveType !== "unpaid" && !noQuotaLeaveTypes.includes(oldLeaveType)) {
        console.log(
          `[EDIT LEAVE] Reverting ${oldLeaveType} balance: +${totalDays} days`
        );
        await tx.leaveBalance.updateMany({
          where: {
            employeeId: currentLeave.employeeId,
            leaveType: oldLeaveType,
            year: leaveYear,
          },
          data: {
            usedDays: { decrement: totalDays },
            remainingDays: { increment: totalDays },
          },
        });
      }

      // STEP 2: Apply new leave balance if status is approved
      // Skip for unpaid and no-quota types (half_day/short_leave deduct from annual cumulatively)
      if (isNowApproved && newLeaveType !== "unpaid" && !noQuotaLeaveTypes.includes(newLeaveType)) {
        console.log(
          `[EDIT LEAVE] Applying ${newLeaveType} balance: -${totalDays} days`
        );

        // Check if balance exists
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveType_year: {
              employeeId: currentLeave.employeeId,
              leaveType: newLeaveType,
              year: leaveYear,
            },
          },
        });

        if (!balance) {
          throw new Error(
            `No leave balance found for ${newLeaveType} leave in ${leaveYear}`
          );
        }

        // Calculate the actual remaining days after reverting old balance (if applicable)
        let availableDays = balance.remainingDays;

        // If we just reverted the same leave type, we need to account for that
        if (wasApproved && oldLeaveType === newLeaveType) {
          availableDays += totalDays; // We just added it back in STEP 1
        }

        console.log(
          `[EDIT LEAVE] Available ${newLeaveType} days: ${availableDays}, Required: ${totalDays}`
        );

        if (availableDays < totalDays) {
          throw new Error(
            `Insufficient ${newLeaveType} leave balance. Available: ${availableDays} days, Required: ${totalDays} days`
          );
        }

        await tx.leaveBalance.updateMany({
          where: {
            employeeId: currentLeave.employeeId,
            leaveType: newLeaveType,
            year: leaveYear,
          },
          data: {
            usedDays: { increment: totalDays },
            remainingDays: { decrement: totalDays },
          },
        });
      } else if (isNowApproved && newLeaveType === "unpaid") {
        console.log(
          `[EDIT LEAVE] New leave type is UNPAID - no balance deduction needed (unlimited)`
        );
      } else if (isNowApproved && noQuotaLeaveTypes.includes(newLeaveType)) {
        console.log(
          `[EDIT LEAVE] New leave type is ${newLeaveType} - cumulative deduction managed at approval time`
        );
      } else if (!isNowApproved) {
        console.log(
          `[EDIT LEAVE] New status is ${newStatus} - no balance deduction needed`
        );
      }

      // STEP 3: Update the leave request
      const updateData: any = {
        leaveType: newLeaveType,
        status: newStatus,
        updatedAt: new Date(),
      };

      // Add appropriate approval/rejection fields based on new status
      if (newStatus === "approved" && !wasApproved) {
        updateData.hrApprovedBy = session.user.employeeId;
        updateData.hrApprovedAt = new Date();
        updateData.hrComment = comments || "Leave edited and approved by HR";
      } else if (newStatus === "rejected") {
        updateData.rejectedBy = session.user.employeeId;
        updateData.rejectedAt = new Date();
        updateData.rejectionReason =
          comments || "Leave edited and rejected by HR";
      } else if (newStatus === "cancelled") {
        updateData.hrComment = comments || "Leave cancelled by HR";
      }

      await tx.leaveRequest.update({
        where: { id },
        data: updateData,
      });

      // STEP 4: Create notification for the employee
      const employee = currentLeave.employee;
      let notificationMessage = "";

      if (leaveTypeChanged && statusChanged) {
        notificationMessage = `Your leave request has been updated. Leave type changed from ${oldLeaveType} to ${newLeaveType} and status changed to ${newStatus}.`;
      } else if (leaveTypeChanged) {
        notificationMessage = `Your leave request type has been changed from ${oldLeaveType} to ${newLeaveType}.`;
      } else if (statusChanged) {
        notificationMessage = `Your leave request status has been changed to ${newStatus}.`;
      }

      if (notificationMessage) {
        await tx.notification.create({
          data: {
            userId: employee.userId,
            title: "Leave Request Updated",
            message:
              notificationMessage + (comments ? ` Comment: ${comments}` : ""),
            type:
              newStatus === "approved"
                ? "success"
                : newStatus === "rejected"
                ? "error"
                : "info",
            isRead: false,
          },
        });
      }
    });

    return NextResponse.json({
      message: "Leave request updated successfully",
      changes: {
        leaveTypeChanged,
        statusChanged,
        oldLeaveType,
        newLeaveType,
        oldStatus,
        newStatus,
      },
    });
  } catch (error: any) {
    console.error("Error editing leave request:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
