"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Incentive } from "@/lib/types";
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
import { useAlert } from "@/components/ui/use-alert";
import { Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface AddIncentiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddIncentiveDialog({ open, onOpenChange, onSuccess }: AddIncentiveDialogProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEmployees();
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
  const currentDate = new Date();

  const [formData, setFormData] = useState({
    employeeId: "",
    type: "punctuality" as "punctuality" | "performance" | "bonus",
    amount: "",
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/incentives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          type: formData.type,
          amount: parseFloat(formData.amount),
          month: formData.month,
          year: formData.year,
          description: formData.description,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        resetForm();
        showAlert({
          type: "success",
          message: "Incentive added successfully",
        });
        // Call onSuccess callback to refresh the list
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to add incentive",
        });
      }
    } catch (error) {
      console.error("Failed to add incentive:", error);
      showAlert({
        type: "error",
        message: "Failed to add incentive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      type: "punctuality",
      amount: "",
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      description: "",
    });
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Incentive</DialogTitle>
          <DialogDescription>
            Award an incentive to an employee for their performance or punctuality.
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
                          const emp = activeEmployees.find((e: any) => e.id === formData.employeeId);
                          return emp ? `${emp.firstName} ${emp.lastName} - ${emp.department || "No Dept"}` : "Select employee";
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Incentive Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "punctuality" | "performance" | "bonus") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="punctuality">Punctuality</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (Rs.) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Month *</Label>
                <Select
                  value={formData.month.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, month: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  min="2020"
                  max="2030"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Reason for awarding this incentive"
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
              {isLoading ? "Adding..." : "Add Incentive"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

