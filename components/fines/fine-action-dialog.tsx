"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Fine } from "@/lib/types";
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

interface FineActionDialogProps {
  fine: Fine | null;
  actionType: "approve" | "waive" | null;
  onClose: () => void;
}

export function FineActionDialog({ fine, actionType, onClose }: FineActionDialogProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!fine || !actionType) return null;

  const handleSubmit = async () => {
    setIsLoading(true);
    // TODO: Implement API call to approve/waive fine
    onClose();
    setIsLoading(false);
  };

  return (
    <Dialog open={!!fine && !!actionType} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {actionType === "approve" ? "Approve Fine" : "Waive Fine"}
          </DialogTitle>
          <DialogDescription>
            {actionType === "approve"
              ? "Confirm this fine for the employee."
              : "Waive this fine with a reason."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Employee</Label>
              <p className="font-medium">
                {fine.employeeId}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <p className="font-medium">Rs. {fine.amount}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="font-medium">
                {format(new Date(fine.date), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Fine Type</Label>
              <p className="font-medium">
                {fine.type === "late_arrival" ? "Late Arrival" :
                 fine.type === "policy_violation" ? "Policy Violation" :
                 fine.type === "misconduct" ? "Misconduct" : "Other"}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">Fine Amount</Label>
            <p className="text-2xl font-bold text-red-600">Rs.{fine.amount}</p>
          </div>

          {fine.type === "late_arrival" ? (
            <div>
              <Label className="text-muted-foreground">Late By</Label>
              <p className="font-medium">{fine.lateMinutes} minutes</p>
            </div>
          ) : (
            <div>
              <Label className="text-muted-foreground">Reason</Label>
              <p className="font-medium">{fine.reason || "-"}</p>
            </div>
          )}

          {actionType === "waive" && (
            <div className="space-y-2">
              <Label htmlFor="comments">Waiver Reason *</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Please provide a reason for waiving this fine"
                rows={3}
                required
              />
            </div>
          )}

          {actionType === "approve" && (
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any comments"
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (actionType === "waive" && !comments)}
            variant={actionType === "approve" ? "destructive" : "default"}
          >
            {isLoading
              ? "Processing..."
              : actionType === "approve"
              ? "Approve Fine"
              : "Waive Fine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

