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

interface Fine {
  id: string;
  employeeName?: string;
  date: string;
  type: string;
  lateMinutes?: number;
  reason?: string | null;
  amount: number;
  status: string;
}

interface CompensationRequestDialogProps {
  fine: Fine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CompensationRequestDialog({
  fine,
  open,
  onOpenChange,
  onSuccess,
}: CompensationRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useAlert();

  if (!fine) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      showAlert({ type: "error", message: "Please provide a reason for compensation" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/fines/${fine.id}/compensation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (response.ok) {
        showAlert({ type: "success", message: "Compensation request submitted successfully" });
        setReason("");
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        const error = await response.json();
        showAlert({ type: "error", message: error.error || "Failed to submit request" });
      }
    } catch (error) {
      showAlert({ type: "error", message: "Failed to submit request" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Compensation</DialogTitle>
          <DialogDescription>
            Submit a request to waive this fine. Super admin will review your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="font-medium">{format(new Date(fine.date), "MMM d, yyyy")}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <p className="font-medium text-red-600">Rs. {fine.amount}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Type</Label>
              <p className="font-medium capitalize">{fine.type.replace("_", " ")}</p>
            </div>
            {fine.lateMinutes && fine.lateMinutes > 0 && (
              <div>
                <Label className="text-muted-foreground">Late By</Label>
                <p className="font-medium">{fine.lateMinutes} minutes</p>
              </div>
            )}
          </div>

          {fine.reason && (
            <div>
              <Label className="text-muted-foreground">Fine Reason</Label>
              <p className="text-sm">{fine.reason}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Your Reason for Compensation *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you think this fine should be waived (e.g., traffic issue, emergency, etc.)"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !reason.trim()}>
            {isLoading ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

