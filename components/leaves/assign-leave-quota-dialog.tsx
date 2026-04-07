"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { InfoIcon, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

interface AssignLeaveQuotaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignLeaveQuotaDialog({
  open,
  onOpenChange,
  onSuccess,
}: AssignLeaveQuotaDialogProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [addToExisting, setAddToExisting] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<any>(null);
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    leaveType: "annual",
    year: new Date().getFullYear().toString(),
    totalDays: "",
  });

  useEffect(() => {
    if (open) {
      fetchEmployees();
      setCurrentBalance(null);
      setAddToExisting(false);
    }
  }, [open]);

  // Fetch current balance when employee, leave type, or year changes
  useEffect(() => {
    if (formData.employeeId && formData.leaveType && formData.year) {
      fetchCurrentBalance();
    } else {
      setCurrentBalance(null);
    }
  }, [formData.employeeId, formData.leaveType, formData.year]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.filter((e: any) => e.status === "active"));
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const fetchCurrentBalance = async () => {
    try {
      const response = await fetch(
        `/api/leave-balance?employeeId=${formData.employeeId}&year=${formData.year}`
      );
      if (response.ok) {
        const data = await response.json();
        const balance = data.find(
          (b: any) => b.leaveType === formData.leaveType
        );
        setCurrentBalance(balance || null);
      }
    } catch (error) {
      console.error("Failed to fetch current balance:", error);
      setCurrentBalance(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/leave-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          addToExisting,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to assign leave quota");
        setIsLoading(false);
        return;
      }

      // Reset form
      setFormData({
        employeeId: "",
        leaveType: "annual",
        year: new Date().getFullYear().toString(),
        totalDays: "",
      });
      setAddToExisting(false);
      setCurrentBalance(null);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEmployee = employees.find((emp) => emp.id === formData.employeeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Leave Quota</DialogTitle>
          <DialogDescription>
            Assign yearly leave quota to an employee. You can add to existing
            balance or replace it entirely.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="employee">Employee *</Label>
              <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedEmployee
                      ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} - ${selectedEmployee.department || "No Dept"}`
                      : "Select employee..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employee..." />
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {employees.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.firstName} ${emp.lastName} ${emp.department || ""}`}
                          onSelect={() => {
                            setFormData({ ...formData, employeeId: emp.id });
                            setEmployeeSearchOpen(false);
                          }}
                        >
                          {emp.firstName} {emp.lastName} - {emp.department || "No Dept"}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select
                value={formData.leaveType}
                onValueChange={(value) =>
                  setFormData({ ...formData, leaveType: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="complementary">
                    Complementary Leave
                  </SelectItem>
                  <SelectItem value="maternity">Maternity Leave</SelectItem>
                  <SelectItem value="umrah">Umrah Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                min="2020"
                max="2100"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalDays">
                {addToExisting ? "Days to Add *" : "Total Days *"}
              </Label>
              <Input
                id="totalDays"
                type="number"
                min="0"
                max="365"
                placeholder={
                  addToExisting ? "e.g., 4 (will be added)" : "e.g., 15"
                }
                value={formData.totalDays}
                onChange={(e) =>
                  setFormData({ ...formData, totalDays: e.target.value })
                }
                required
              />
            </div>

            {/* Current Balance Info */}
            {currentBalance && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <InfoIcon className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-blue-900">
                      Current Balance for {formData.year}
                    </p>
                    <div className="mt-1 space-y-1 text-blue-700">
                      <p>Total: {currentBalance.totalDays} days</p>
                      <p>Used: {currentBalance.usedDays} days</p>
                      <p>Remaining: {currentBalance.remainingDays} days</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add to Existing Toggle */}
            {currentBalance && (
              <div className="flex items-center justify-between space-x-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <Label
                    htmlFor="addToExisting"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Add to existing balance
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    {addToExisting
                      ? `Will add ${formData.totalDays || 0} days to current ${
                          currentBalance.totalDays
                        } days = ${
                          currentBalance.totalDays +
                          parseInt(formData.totalDays || "0")
                        } total days`
                      : `Will replace current ${
                          currentBalance.totalDays
                        } days with ${formData.totalDays || 0} days`}
                  </p>
                </div>
                <Switch
                  id="addToExisting"
                  checked={addToExisting}
                  onCheckedChange={setAddToExisting}
                />
              </div>
            )}

            {/* Warning for Replace Mode */}
            {currentBalance && !addToExisting && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Warning:</strong> This will replace the existing
                  quota. The employee currently has{" "}
                  {currentBalance.remainingDays} days remaining. After
                  replacement, they will have{" "}
                  {Math.max(
                    0,
                    parseInt(formData.totalDays || "0") -
                      currentBalance.usedDays
                  )}{" "}
                  days remaining.
                </AlertDescription>
              </Alert>
            )}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Assigning..." : "Assign Quota"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
