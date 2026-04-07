"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAlert } from "@/components/ui/use-alert";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

interface AddFineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddFineDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddFineDialogProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [employeeSearch, setEmployeeSearch] = useState("");

  useEffect(() => {
    if (open) {
      fetchEmployees();
      setDate(new Date());
    }
  }, [open]);

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

  // Filter active employees only (API already filters by department for managers)
  const activeEmployees = employees.filter((e: any) => e.status === "active");

  const [formData, setFormData] = useState({
    employeeId: "",
    type: "late_arrival",
    lateMinutes: "",
    reason: "",
    amount: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      showAlert({
        type: "error",
        message: "Please select a date",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          date: date.toISOString().split("T")[0],
          type: formData.type,
          lateMinutes:
            formData.type === "late_arrival"
              ? parseInt(formData.lateMinutes)
              : 0,
          reason: formData.type !== "late_arrival" ? formData.reason : null,
          amount: parseFloat(formData.amount),
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        resetForm();
        showAlert({
          type: "success",
          message: "Fine added successfully",
        });
        // Call onSuccess callback to refresh the list
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to add fine",
        });
      }
    } catch (error) {
      console.error("Failed to add fine:", error);
      showAlert({
        type: "error",
        message: "Failed to add fine",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      type: "late_arrival",
      lateMinutes: "",
      reason: "",
      amount: "",
    });
    setDate(new Date());
    setEmployeeSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Fine</DialogTitle>
          <DialogDescription>
            Manually add a fine for an employee's late arrival.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      !formData.employeeId && "text-muted-foreground"
                    )}
                  >
                    {formData.employeeId
                      ? (() => {
                          const emp = activeEmployees.find(
                            (e: any) => e.id === formData.employeeId
                          );
                          return emp
                            ? `${emp.firstName} ${emp.lastName} - ${
                                emp.department || "No Dept"
                              }`
                            : "Select employee";
                        })()
                      : "Select employee"}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search employee..." />
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {activeEmployees.map((emp: any) => (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.firstName} ${emp.lastName} ${emp.employeeId}`}
                          onSelect={() => {
                            setFormData({ ...formData, employeeId: emp.id });
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {emp.employeeId} - {emp.department || "No Dept"}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Fine Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fine type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="late_arrival">Late Arrival</SelectItem>
                  <SelectItem value="policy_violation">
                    Policy Violation
                  </SelectItem>
                  <SelectItem value="misconduct">Misconduct</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar selected={date} onSelect={setDate} />
                </PopoverContent>
              </Popover>
            </div>

            {formData.type === "late_arrival" ? (
              <div className="space-y-2">
                <Label htmlFor="lateMinutes">Late By (minutes) *</Label>
                <Input
                  id="lateMinutes"
                  type="number"
                  min="1"
                  value={formData.lateMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, lateMinutes: e.target.value })
                  }
                  placeholder="e.g., 30"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  placeholder="Describe the reason for this fine..."
                  rows={3}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Fine Amount (Rs.) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="e.g., 500"
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
              {isLoading ? "Adding..." : "Add Fine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
