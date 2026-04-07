"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { LeaveRequest, LeaveStatus } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format, differenceInDays } from "date-fns";
import { useAlert } from "@/components/ui/use-alert";

interface LeaveApprovalDialogProps {
  leave: LeaveRequest | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ExtendedLeaveApprovalDialogProps extends LeaveApprovalDialogProps {
  onEdit?: (leave: LeaveRequest) => void;
}

export function LeaveApprovalDialog({
  leave,
  onClose,
  onSuccess,
  onEdit,
}: ExtendedLeaveApprovalDialogProps) {
  const { user, hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deductBalance, setDeductBalance] = useState(true);

  if (!leave) return null;

  const days =
    differenceInDays(new Date(leave.endDate), new Date(leave.startDate)) + 1;
  const isHR = hasPermission("approve_all_leaves");
  const isManager = hasPermission("approve_leaves_manager");
  const canEdit = user?.role === "super_admin" || user?.role === "manager";

  // Determine if user can approve this leave
  const canApprove =
    (leave.status === "pending" || leave.status === "manager_approved") &&
    (isManager || isHR);

  // View-only mode if user cannot approve
  const isViewOnly = !canApprove;

  const handleApprove = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/leaves/${leave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          comments,
          deductBalance,
        }),
      });

      if (response.ok) {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
        showAlert({
          type: "success",
          message: "Leave request approved successfully",
        });
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to approve leave",
        });
      }
    } catch (error) {
      console.error("Failed to approve leave:", error);
      showAlert({
        type: "error",
        message: "Failed to approve leave",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/leaves/${leave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          comments,
        }),
      });

      if (response.ok) {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
        showAlert({
          type: "success",
          message: "Leave request rejected successfully",
        });
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to reject leave",
        });
      }
    } catch (error) {
      console.error("Failed to reject leave:", error);
      showAlert({
        type: "error",
        message: "Failed to reject leave",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={!!leave} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {isViewOnly ? "Leave Request Details" : "Review Leave Request"}
          </DialogTitle>
          <DialogDescription>
            {isViewOnly
              ? "View the details of this leave request."
              : "Review and approve or reject this leave request."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Employee ID</Label>
              <p className="font-medium">{leave.employeeId}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Duration</Label>
              <p className="font-medium">{days} day(s)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Leave Type</Label>
              <p className="font-medium capitalize">{leave.leaveType}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Duration</Label>
              <p className="font-medium">{days} day(s)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Start Date</Label>
              <p className="font-medium">
                {format(new Date(leave.startDate), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">End Date</Label>
              <p className="font-medium">
                {format(new Date(leave.endDate), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">Reason</Label>
            <p className="font-medium">{leave.reason}</p>
          </div>

          <div>
            <Label className="text-muted-foreground">Current Status</Label>
            <div className="mt-1">
              <Badge
                variant={
                  leave.status === "pending"
                    ? "warning"
                    : leave.status === "manager_approved"
                      ? "default"
                      : "secondary"
                }
              >
                {leave.status.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {/* Show existing comments from manager */}
          {leave.managerComment && (
            <div className="bg-muted/50 p-3 rounded-md">
              <Label className="text-muted-foreground">Manager's Comment</Label>
              <p className="text-sm mt-1">{leave.managerComment}</p>
              {leave.managerApprovedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(
                    new Date(leave.managerApprovedAt),
                    "MMM d, yyyy 'at' h:mm a",
                  )}
                </p>
              )}
            </div>
          )}

          {/* Show existing comments from HR */}
          {leave.hrComment && (
            <div className="bg-muted/50 p-3 rounded-md">
              <Label className="text-muted-foreground">
                HR's CommentHR Comment (Optional)
              </Label>
              <p className="text-sm mt-1">{leave.hrComment}</p>
              {leave.hrApprovedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(
                    new Date(leave.hrApprovedAt),
                    "MMM d, yyyy 'at' h:mm a",
                  )}
                </p>
              )}
            </div>
          )}

          {/* Show rejection reason */}
          {leave.status === "rejected" && leave.rejectionReason && (
            <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20">
              <Label className="text-destructive">Rejection Reason</Label>
              <p className="text-sm mt-1">{leave.rejectionReason}</p>
              {leave.rejectedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(
                    new Date(leave.rejectedAt),
                    "MMM d, yyyy 'at' h:mm a",
                  )}
                </p>
              )}
            </div>
          )}

          {/* Only show comment input if user can approve */}
          {!isViewOnly && (user?.role === "super_admin" || isManager) && (
            <div className="space-y-2">
              <Label htmlFor="comments">
                {isManager && !isHR
                  ? "Manager's Comment (Optional)"
                  : "Admin Comment (Optional)"}
              </Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any comments for the employee"
                rows={3}
              />
            </div>
          )}

          {/* Deduct Leave Balance checkbox — only visible to Super Admin */}
          {!isViewOnly && user?.role === "super_admin" && (
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <Checkbox
                id="deductBalance"
                checked={deductBalance}
                onCheckedChange={(checked) =>
                  setDeductBalance(checked === true)
                }
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor="deductBalance"
                  className="cursor-pointer font-medium text-amber-900"
                >
                  Deduct Leave Balance
                </Label>
                <p className="text-xs text-amber-700">
                  Uncheck to approve this leave without deducting from the
                  employee&apos;s leave balance.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isViewOnly ? (
            <>
              {canEdit && onEdit && leave.employeeId !== user?.employeeId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onEdit(leave);
                  }}
                >
                  Edit Leave
                </Button>
              )}
              <Button onClick={onClose}>Close</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {canEdit && onEdit && leave.employeeId !== user?.employeeId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onEdit(leave);
                  }}
                >
                  Edit
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isLoading}
              >
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={isLoading}>
                {leave.status === "pending" && isManager && !isHR
                  ? "Approve (Manager)"
                  : "Approve"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
