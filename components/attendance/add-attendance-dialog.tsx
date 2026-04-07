"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAlert } from "@/components/ui/use-alert";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateLateMinutes, determineAttendanceStatus, getOfficeStartTimeForDate } from "@/lib/attendance-utils";
import { format } from "date-fns";

interface AddAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  department?: { name: string };
}

interface SystemSettings {
  graceMinutes: number;
  dailyTimings?: any;
  fineRules?: any[];
}

export function AddAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddAttendanceDialogProps) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    graceMinutes: 15,
    dailyTimings: null,
    fineRules: [],
  });
  const [formData, setFormData] = useState({
    employeeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    checkIn: "",
    checkOut: "",
    status: "on_time" as "on_time" | "late" | "absent" | "half_day" | "leave",
    lateMinutes: 0,
    notes: "",
  });
  const [autoCalculated, setAutoCalculated] = useState(true);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchSettings();
      // Reset form when dialog opens
      setFormData({
        employeeId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        checkIn: "",
        checkOut: "",
        status: "on_time",
        lateMinutes: 0,
        notes: "",
      });
      setAutoCalculated(true);
    }
  }, [open]);

  // Auto-calculate late minutes and status when check-in time, date, or settings change
  useEffect(() => {
    if (formData.checkIn && formData.date && autoCalculated) {
      // Get office start time for the specific date from daily timings
      const officeStartTime = getOfficeStartTimeForDate(
        formData.date,
        settings.dailyTimings,
        '09:00' // Default fallback
      );

      const lateMinutes = calculateLateMinutes(
        formData.checkIn,
        officeStartTime,
        settings.graceMinutes
      );

      const status = determineAttendanceStatus(
        formData.checkIn,
        formData.checkOut || undefined,
        officeStartTime,
        settings.graceMinutes
      );

      setFormData((prev) => ({
        ...prev,
        lateMinutes,
        status,
      }));
    }
  }, [formData.checkIn, formData.checkOut, formData.date, settings, autoCalculated]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings({
          graceMinutes: data.graceMinutes || 15,
          dailyTimings: data.dailyTimings,
          fineRules: data.fineRules || [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const checkExistingRecord = async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/attendance?employeeId=${formData.employeeId}&date=${formData.date}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.length > 0;
      }
    } catch (error) {
      console.error("Failed to check existing record:", error);
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation: Check if date is in the future
      const selectedDate = new Date(formData.date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        showAlert({
          type: "error",
          message: "Cannot add attendance for future dates",
        });
        setLoading(false);
        return;
      }

      // Check if record already exists
      const exists = await checkExistingRecord();
      if (exists) {
        const confirmed = window.confirm(
          "An attendance record already exists for this employee on this date. Do you want to update it?"
        );
        if (!confirmed) {
          setLoading(false);
          return;
        }
      }

      // Prepare attendance record
      const attendanceRecord = {
        employeeId: formData.employeeId,
        date: formData.date,
        checkIn: formData.checkIn || undefined,
        checkOut: formData.checkOut || undefined,
        status: formData.status,
        lateMinutes: formData.lateMinutes,
        notes: formData.notes || undefined,
        source: "manual",
      };

      // Submit to API
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: [attendanceRecord] }),
      });

      if (response.ok) {
        showAlert({
          type: "success",
          message: "Attendance record added successfully",
        });

        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to add attendance record",
        });
      }
    } catch (error) {
      console.error("Error adding attendance:", error);
      showAlert({
        type: "error",
        message: "An error occurred while adding attendance",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      status: value as typeof formData.status,
    }));
    // Disable auto-calculation when status is manually changed
    setAutoCalculated(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Attendance Record</DialogTitle>
          <DialogDescription>
            Manually add an attendance record for an employee
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            {/* Employee Selection */}
            <div className="grid gap-2">
              <Label htmlFor="employee">Employee *</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, employeeId: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                      {emp.department ? ` - ${emp.department.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                max={format(new Date(), "yyyy-MM-dd")}
                required
              />
              <p className="text-xs text-muted-foreground">
                Cannot select future dates
              </p>
            </div>

            {/* Check-in Time */}
            <div className="grid gap-2">
              <Label htmlFor="checkIn">Check-in Time</Label>
              <Input
                id="checkIn"
                type="time"
                value={formData.checkIn}
                onChange={(e) =>
                  setFormData({ ...formData, checkIn: e.target.value })
                }
              />
            </div>

            {/* Check-out Time */}
            <div className="grid gap-2">
              <Label htmlFor="checkOut">Check-out Time (Optional)</Label>
              <Input
                id="checkOut"
                type="time"
                value={formData.checkOut}
                onChange={(e) =>
                  setFormData({ ...formData, checkOut: e.target.value })
                }
              />
            </div>

            {/* Late Minutes (Read-only) */}
            <div className="grid gap-2">
              <Label htmlFor="lateMinutes">Late Minutes (Auto-calculated)</Label>
              <Input
                id="lateMinutes"
                type="number"
                value={formData.lateMinutes}
                readOnly
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">
                Calculated based on daily timings and grace period ({settings.graceMinutes} minutes)
              </p>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={handleStatusChange}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_time">On Time</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {autoCalculated
                  ? "Auto-calculated based on check-in time. Change to override."
                  : "Manual override active"}
              </p>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.employeeId}>
              {loading ? "Adding..." : "Add Attendance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

