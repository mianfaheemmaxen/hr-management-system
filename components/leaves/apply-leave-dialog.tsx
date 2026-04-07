"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { LeaveType, LeaveRequest } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { differenceInDays, subDays } from "date-fns";
import { useAlert } from "@/components/ui/use-alert";

interface ApplyLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const leaveTypes: { value: LeaveType; label: string }[] = [
  { value: "sick", label: "Sick Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "complementary", label: "Complementary Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "umrah", label: "Umrah Leave" },
  { value: "half_day", label: "Half Day Leave" },
  { value: "short_leave", label: "Short Leave" },
];

// Leave types that don't have their own quota (deduct from annual leave)
const noQuotaLeaveTypes: LeaveType[] = ["half_day", "short_leave"];

export function ApplyLeaveDialog({ open, onOpenChange, onSuccess }: ApplyLeaveDialogProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    leaveType: "" as LeaveType,
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Calculate minimum date (30 days before today)
  const minDate = subDays(new Date(), 30).toISOString().split("T")[0];

  // Fetch leave balances when dialog opens
  useEffect(() => {
    if (open && user) {
      fetchLeaveBalances();
    }
  }, [open, user]);

  const fetchLeaveBalances = async () => {
    if (!user || !user.employeeId) return;

    try {
      const response = await fetch(`/api/leave-balance?employeeId=${user.employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setLeaveBalances(data);
      }
    } catch (error) {
      console.error("Failed to fetch leave balances:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!user) {
      setError("User not authenticated");
      setIsLoading(false);
      return;
    }

    // Check if user has an employee record
    if (!user.employeeId) {
      setError("You don't have an employee record. Please contact HR to set up your employee profile.");
      setIsLoading(false);
      return;
    }

    // Calculate days
    const days = differenceInDays(new Date(formData.endDate), new Date(formData.startDate)) + 1;

    // Check leave balance (except for unpaid leave and no-quota types like half_day/short_leave)
    if (formData.leaveType !== "unpaid" && !noQuotaLeaveTypes.includes(formData.leaveType)) {
      const balance = leaveBalances.find((b) => b.leaveType === formData.leaveType);
      if (!balance) {
        setError(`No leave quota assigned for ${formData.leaveType} leave. Please contact HR.`);
        setIsLoading(false);
        return;
      }
      if (balance.remainingDays < days) {
        setError(`Insufficient leave balance. You have ${balance.remainingDays} day(s) remaining but requested ${days} day(s).`);
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: user.employeeId,
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          totalDays: days,
          reason: formData.reason,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        resetForm();
        
        // Show success message with approval info based on user role
        let approvalMessage = "Leave request submitted successfully.";
        if (user.role === "manager") {
          approvalMessage += " Your request will be reviewed by HR or System Admin.";
        } else if (user.role === "hr_manager") {
          approvalMessage += " Your request will be reviewed by System Admin.";
        } else if (user.role === "super_admin") {
          approvalMessage += " As System Admin, your request can be reviewed by any System Admin or by yourself.";
        } else {
          approvalMessage += " Your request will be reviewed by your manager.";
        }
        
        showAlert({
          type: "success",
          message: approvalMessage,
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const data = await response.json();
        setError(data.error || "Failed to apply for leave");
      }
    } catch (error) {
      console.error("Failed to apply for leave:", error);
      setError("Failed to apply for leave");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      leaveType: "" as LeaveType,
      startDate: "",
      endDate: "",
      reason: "",
    });
    setError("");
  };

  const selectedBalance = leaveBalances.find((b) => b.leaveType === formData.leaveType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>
            Submit a leave request for approval. You can select dates from the past 30 days.
            {user?.role === "manager" && (
              <span className="block mt-2 text-amber-600">
                Note: As a manager, your leave requests will be approved by HR or System Admin.
              </span>
            )}
            {user?.role === "hr_manager" && (
              <span className="block mt-2 text-amber-600">
                Note: As HR Manager, your leave requests will be approved by System Admin only.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select
                value={formData.leaveType}
                onValueChange={(value: LeaveType) =>
                  setFormData({ ...formData, leaveType: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBalance && (
                <p className="text-sm text-muted-foreground">
                  Available: {selectedBalance.remainingDays} of {selectedBalance.totalDays} days
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  min={minDate}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  min={formData.startDate || minDate}
                  required
                />
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <>
                <p className="text-sm text-muted-foreground">
                  Duration:{" "}
                  {differenceInDays(new Date(formData.endDate), new Date(formData.startDate)) + 1}{" "}
                  day(s)
                </p>
                {(formData.leaveType === "unpaid" || noQuotaLeaveTypes.includes(formData.leaveType)) ? (
                  <Alert>
                    <AlertDescription className="text-blue-600">
                      {formData.leaveType === "half_day"
                        ? "ℹ️ Half Day leaves deduct from your Annual Leave balance (every 2 half days = 1 day)."
                        : formData.leaveType === "short_leave"
                        ? "ℹ️ Short leaves deduct from your Annual Leave balance (every 3 short leaves = 1 day)."
                        : "ℹ️ Unpaid leaves have no quota limit. You can apply for any duration."}
                    </AlertDescription>
                  </Alert>
                ) : formData.leaveType && selectedBalance ? (
                  <>
                    {differenceInDays(new Date(formData.endDate), new Date(formData.startDate)) + 1 > selectedBalance.remainingDays ? (
                      <Alert variant="destructive">
                        <AlertDescription>
                          Insufficient balance! You only have {selectedBalance.remainingDays} day(s) remaining.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <AlertDescription className="text-green-600">
                          After this leave, you will have {selectedBalance.remainingDays - (differenceInDays(new Date(formData.endDate), new Date(formData.startDate)) + 1)} day(s) remaining.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : null}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Please provide a reason for your leave request"
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

