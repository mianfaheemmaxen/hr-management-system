"use client";

import { useState } from "react";
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
import { format } from "date-fns";
import { useAlert } from "@/components/ui/use-alert";
import { CheckCircle, XCircle } from "lucide-react";

interface Fine {
  id: string;
  employeeName?: string;
  date: string;
  type: string;
  lateMinutes?: number;
  reason?: string | null;
  amount: number;
  status: string;
  compensationReason?: string | null;
  compensationRequestedAt?: string | null;
  compensationRejectionReason?: string | null;
  compensationStatus?: string | null;
}

interface CompensationApprovalDialogProps {
  fine: Fine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CompensationApprovalDialog({
  fine,
  open,
  onOpenChange,
  onSuccess,
}: CompensationApprovalDialogProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const { showAlert } = useAlert();

  if (!fine) return null;

  const handleAction = async (actionType: "approve" | "reject") => {
    setIsLoading(true);
    setAction(actionType);
    try {
      const response = await fetch(`/api/fines/${fine.id}/compensation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          rejectionReason: actionType === "reject" && rejectionReason.trim() ? rejectionReason.trim() : undefined
        }),
      });

      if (response.ok) {
        showAlert({ 
          type: "success", 
          message: actionType === "approve" 
            ? "Compensation approved - fine has been waived" 
            : "Compensation request rejected" 
        });
        setRejectionReason("");
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        const error = await response.json();
        showAlert({ type: "error", message: error.error || "Failed to process request" });
      }
    } catch (error) {
      showAlert({ type: "error", message: "Failed to process request" });
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  const handleClose = () => {
    setRejectionReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Review Compensation Request</DialogTitle>
          <DialogDescription>
            Review the employee's request and approve or reject the compensation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Employee</Label>
              <p className="font-medium">{fine.employeeName || "Unknown"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Fine Amount</Label>
              <p className="font-medium text-red-600">Rs. {fine.amount}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="font-medium">{format(new Date(fine.date), "MMM d, yyyy")}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Type</Label>
              <p className="font-medium capitalize">{fine.type.replace("_", " ")}</p>
            </div>
          </div>

          {fine.lateMinutes && fine.lateMinutes > 0 && (
            <div>
              <Label className="text-muted-foreground">Late By</Label>
              <p className="font-medium">{fine.lateMinutes} minutes</p>
            </div>
          )}

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <Label className="text-muted-foreground">Employee's Reason for Compensation</Label>
            <p className="mt-1 text-sm">{fine.compensationReason || "No reason provided"}</p>
            {fine.compensationRequestedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Requested on {format(new Date(fine.compensationRequestedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </div>

          {fine.compensationStatus === "rejected" && fine.compensationRejectionReason && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <Label className="text-muted-foreground">Previous Rejection Reason</Label>
              <p className="mt-1 text-sm">{fine.compensationRejectionReason}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rejectionReason">Rejection Reason (optional)</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Optionally explain why the compensation request is being rejected..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={() => handleAction("reject")} 
            disabled={isLoading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            {isLoading && action === "reject" ? "Rejecting..." : "Reject"}
          </Button>
          <Button 
            variant="default" 
            onClick={() => handleAction("approve")} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isLoading && action === "approve" ? "Approving..." : "Approve & Waive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

