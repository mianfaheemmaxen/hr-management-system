"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { LeaveRequest, LeaveType, LeaveStatus } from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useAlert } from "@/components/ui/use-alert";

interface EditLeaveDialogProps {
  leave: LeaveRequest | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditLeaveDialog({ leave, onClose, onSuccess }: EditLeaveDialogProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [leaveType, setLeaveType] = useState<LeaveType>("sick");
  const [status, setStatus] = useState<LeaveStatus>("pending");
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canEdit = user?.role === "super_admin" || user?.role === "manager";

  useEffect(() => {
    if (leave) {
      setLeaveType(leave.leaveType);
      setStatus(leave.status);
      setComments("");
    }
  }, [leave]);

  if (!leave || !canEdit) return null;

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/leaves/${leave.id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType,
          status,
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
          message: "Leave request updated successfully",
        });
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to update leave request",
        });
      }
    } catch (error) {
      console.error("Failed to update leave:", error);
      showAlert({
        type: "error",
        message: "Failed to update leave request",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = leaveType !== leave.leaveType || status !== leave.status;

  return (
    <Dialog open={!!leave} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Leave Request</DialogTitle>
          <DialogDescription>
            Modify the leave type or status. Leave balances will be updated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Employee</Label>
              <p className="font-medium">{leave.employeeId}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Duration</Label>
              <p className="font-medium">{leave.totalDays} day(s)</p>
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

          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave Type</Label>
            <Select value={leaveType} onValueChange={(value) => setLeaveType(value as LeaveType)}>
              <SelectTrigger id="leaveType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="annual">Annual Leave</SelectItem>
                <SelectItem value="complementary">Complementary Leave</SelectItem>
                <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                <SelectItem value="maternity">Maternity Leave</SelectItem>
                <SelectItem value="umrah">Umrah Leave</SelectItem>
                <SelectItem value="half_day">Half Day Leave</SelectItem>
                <SelectItem value="short_leave">Short Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as LeaveStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="manager_approved">Manager Approved</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Add any comments about this change..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          {hasChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Changing the leave type or status will automatically update the employee's leave balance.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

