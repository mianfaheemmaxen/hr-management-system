"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileText, MessageSquare, Award, Calendar } from "lucide-react";
import { EvaluationType, EvaluationStatus } from "@/lib/types";

interface AddEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  onSuccess?: () => void;
}

export function AddEvaluationDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  onSuccess,
}: AddEvaluationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [evaluationType, setEvaluationType] = useState<EvaluationType>("test");
  const [formData, setFormData] = useState({
    name: "",
    totalMarks: "",
    obtainedMarks: "",
    status: "pass" as EvaluationStatus,
    notes: "",
    wasRetaken: false,
    evaluationDate: new Date().toISOString().split("T")[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (evaluationType === "test") {
      if (formData.totalMarks && formData.obtainedMarks) {
        const total = parseFloat(formData.totalMarks);
        const obtained = parseFloat(formData.obtainedMarks);
        if (obtained > total) {
          newErrors.obtainedMarks = "Obtained marks cannot exceed total marks";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        evaluationType,
        name: formData.name,
        status: formData.status,
        notes: formData.notes || null,
        wasRetaken: formData.wasRetaken,
        evaluationDate: formData.evaluationDate,
      };

      if (evaluationType === "test") {
        payload.totalMarks = formData.totalMarks ? parseInt(formData.totalMarks) : null;
        payload.obtainedMarks = formData.obtainedMarks ? parseInt(formData.obtainedMarks) : null;
      }

      const response = await fetch(`/api/employees/${employeeId}/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          name: "",
          totalMarks: "",
          obtainedMarks: "",
          status: "pass",
          notes: "",
          wasRetaken: false,
          evaluationDate: new Date().toISOString().split("T")[0],
        });
        setEvaluationType("test");
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create evaluation");
      }
    } catch (error) {
      console.error("Failed to create evaluation:", error);
      alert("Failed to create evaluation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#00b576]" />
            Add Evaluation for {employeeName}
          </DialogTitle>
          <DialogDescription>
            Record a test or interview evaluation for this employee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Evaluation Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Evaluation Type *</Label>
            <RadioGroup
              value={evaluationType}
              onValueChange={(value) => setEvaluationType(value as EvaluationType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="test" id="test" />
                <Label htmlFor="test" className="font-normal cursor-pointer">
                  Test
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="interview" id="interview" />
                <Label htmlFor="interview" className="font-normal cursor-pointer">
                  Interview
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {evaluationType === "test" ? "Test Name" : "Interview Name"} *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={evaluationType === "test" ? "e.g., Technical Assessment" : "e.g., HR Interview"}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Conditional Fields for Test */}
          {evaluationType === "test" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalMarks">Total Marks</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  min="0"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obtainedMarks">Obtained Marks</Label>
                <Input
                  id="obtainedMarks"
                  type="number"
                  min="0"
                  value={formData.obtainedMarks}
                  onChange={(e) => setFormData({ ...formData, obtainedMarks: e.target.value })}
                  placeholder="85"
                  className={errors.obtainedMarks ? "border-red-500" : ""}
                />
                {errors.obtainedMarks && (
                  <p className="text-sm text-red-500">{errors.obtainedMarks}</p>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Status *
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as EvaluationStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Evaluation Date */}
          <div className="space-y-2">
            <Label htmlFor="evaluationDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Evaluation Date
            </Label>
            <Input
              id="evaluationDate"
              type="date"
              value={formData.evaluationDate}
              onChange={(e) => setFormData({ ...formData, evaluationDate: e.target.value })}
            />
          </div>

          {/* Was Retaken */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="wasRetaken"
              checked={formData.wasRetaken}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, wasRetaken: checked as boolean })
              }
            />
            <Label htmlFor="wasRetaken" className="font-normal cursor-pointer">
              This was a retake
            </Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes or comments..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Evaluation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


