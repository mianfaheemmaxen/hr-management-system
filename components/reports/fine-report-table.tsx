"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Fine, Employee, MonthlyDeductibleFine } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAlert } from "@/components/ui/use-alert";
import {
  Save,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface FineReportTableProps {
  fines: Fine[];
  employees: Employee[];
  month: number;
  year: number;
  onDeductibleFinesChange?: (deductibleData: DeductibleFineData[]) => void;
}

export interface DeductibleFineData {
  employeeId: string;
  employeeName: string;
  totalActualAmount: number;
  deductibleAmount: number;
  finalDeductibleAmount: number;
  fines: Fine[];
}

interface EmployeeFineGroup {
  employee: Employee | undefined;
  fines: Fine[];
  totalAmount: number;
  calculatedDeductible: number;
  finalDeductible: number;
  hasWaivedFines: boolean;
}

export function FineReportTable({
  fines,
  employees,
  month,
  year,
  onDeductibleFinesChange,
}: FineReportTableProps) {
  const { showAlert } = useAlert();

  const [globalMultiplier, setGlobalMultiplier] = useState<2 | 1>(2);
  const [finalDeductibleAmounts, setFinalDeductibleAmounts] = useState<
    Record<string, number>
  >({});
  const [savedData, setSavedData] = useState<
    Record<string, MonthlyDeductibleFine>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastNotifiedRef = useRef<string>("");

  // Load saved data
  const loadSavedData = useCallback(async () => {
    if (!month || !year) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/monthly-deductible-fines?month=${month}&year=${year}`,
      );
      if (response.ok) {
        const data: MonthlyDeductibleFine[] = await response.json();
        const dataMap: Record<string, MonthlyDeductibleFine> = {};
        const amounts: Record<string, number> = {};

        data.forEach((record) => {
          dataMap[record.employeeId] = record;
          amounts[record.employeeId] = record.finalDeductibleAmount;
        });

        setSavedData(dataMap);
        setFinalDeductibleAmounts(amounts);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
      showAlert({
        type: "error",
        message: "Failed to load saved data. Please try again.",
      });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [month, year, showAlert]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    loadSavedData();
  }, [loadSavedData]);

  // Group and calculate fines
  const employeeGroups = useMemo(() => {
    const groups: Record<string, EmployeeFineGroup> = {};

    fines.forEach((fine) => {
      if (!groups[fine.employeeId]) {
        const employee = employees.find((e) => e.id === fine.employeeId);
        groups[fine.employeeId] = {
          employee,
          fines: [],
          totalAmount: 0,
          calculatedDeductible: 0,
          finalDeductible: 0,
          hasWaivedFines: false,
        };
      }

      groups[fine.employeeId].fines.push(fine);
      if (fine.status !== "waived") {
        groups[fine.employeeId].totalAmount += fine.amount;
      }

      if (fine.status === "waived") {
        groups[fine.employeeId].hasWaivedFines = true;
      }
    });

    // Calculate deductions for each group
    Object.entries(groups).forEach(([employeeId, group]) => {
      const calculated = group.totalAmount * globalMultiplier;
      const final = finalDeductibleAmounts[employeeId] ?? calculated;

      group.calculatedDeductible = calculated;
      group.finalDeductible = final;
      group.fines.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    });

    return groups;
  }, [fines, employees, globalMultiplier, finalDeductibleAmounts]);

  // Calculate totals
  const totals = useMemo(() => {
    let actual = 0;
    let calculated = 0;
    let final = 0;

    Object.values(employeeGroups).forEach((group) => {
      actual += group.totalAmount;
      calculated += group.calculatedDeductible;
      final += group.finalDeductible;
    });

    return { actual, calculated, final };
  }, [employeeGroups]);

  // Toggle multiplier
  const toggleMultiplier = () => {
    const newMultiplier = globalMultiplier === 2 ? 1 : 2;
    setGlobalMultiplier(newMultiplier);
    setFinalDeductibleAmounts({});
    setHasUnsavedChanges(true);
    showAlert({
      type: "info",
      message: `Multiplier set to ${newMultiplier}x. All manual edits have been reset.`,
    });
  };

  // Update final deductible amount
  const updateFinalDeductible = (employeeId: string, value: number) => {
    const numValue = Math.max(0, isNaN(value) ? 0 : value);
    setFinalDeductibleAmounts((prev) => ({
      ...prev,
      [employeeId]: numValue,
    }));
    setHasUnsavedChanges(true);
  };

  // Reset to calculated values
  const resetToCalculated = () => {
    setFinalDeductibleAmounts({});
    setHasUnsavedChanges(true);
    showAlert({
      type: "info",
      message: "All amounts reset to calculated values.",
    });
  };

  // Reset single employee
  const resetEmployee = (employeeId: string) => {
    const group = employeeGroups[employeeId];
    if (group) {
      updateFinalDeductible(employeeId, group.calculatedDeductible);
    }
  };

  // Save data
  const saveData = async () => {
    setIsSaving(true);
    try {
      const records = Object.entries(employeeGroups).map(
        ([employeeId, group]) => ({
          employeeId,
          month,
          year,
          actualAmount: group.totalAmount,
          deductibleAmount: group.calculatedDeductible,
          finalDeductibleAmount: group.finalDeductible,
          multiplier: globalMultiplier,
        }),
      );

      const response = await fetch("/api/monthly-deductible-fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      if (response.ok) {
        showAlert({
          type: "success",
          message: "Report saved successfully!",
        });
        setHasUnsavedChanges(false);
        await loadSavedData();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }
    } catch (error) {
      showAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save data",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Notify parent
  useEffect(() => {
    if (!onDeductibleFinesChange) return;

    const deductibleData = Object.entries(employeeGroups).map(
      ([employeeId, group]) => ({
        employeeId,
        employeeName: group.employee
          ? `${group.employee.firstName} ${group.employee.lastName}`
          : "Unknown",
        totalActualAmount: group.totalAmount,
        deductibleAmount: group.calculatedDeductible,
        finalDeductibleAmount: group.finalDeductible,
        fines: group.fines,
      }),
    );

    const signature = JSON.stringify(
      deductibleData.map((d) => ({
        id: d.employeeId,
        final: d.finalDeductibleAmount,
      })),
    );

    if (signature !== lastNotifiedRef.current) {
      lastNotifiedRef.current = signature;
      onDeductibleFinesChange(deductibleData);
    }
  }, [employeeGroups, onDeductibleFinesChange]);

  // Format late minutes
  const formatLateTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  // Check if any waived fines exist
  const hasAnyWaivedFines = useMemo(() => {
    return Object.values(employeeGroups).some((group) => group.hasWaivedFines);
  }, [employeeGroups]);

  // Get month name for display
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthYearDisplay = `${monthNames[month - 1]} ${year}`;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">Loading Report</p>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b pb-4">
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-2xl font-bold">
              Late Penalty Voucher
            </CardTitle>
            <Badge variant="secondary" className="text-base px-3 py-1.5">
              {monthYearDisplay}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Multiplier Toggle Button */}
            <Button
              variant={globalMultiplier === 2 ? "default" : "outline"}
              size="sm"
              onClick={toggleMultiplier}
              className="gap-2"
            >
              {globalMultiplier === 2 ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  2x Multiplier
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  1x Multiplier
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={resetToCalculated}
              disabled={Object.keys(finalDeductibleAmounts).length === 0}
            >
              Reset All
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadSavedData}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={saveData}
              disabled={
                isSaving ||
                !hasUnsavedChanges ||
                Object.keys(employeeGroups).length === 0
              }
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Report
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t mt-4">
          <div className="flex items-center gap-3">
            {hasUnsavedChanges ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Unsaved changes</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-800 rounded-lg border border-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">All changes saved</span>
              </div>
            )}

            {hasAnyWaivedFines && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                Contains waived fines
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="text-center min-w-[120px]">
              <div className="text-sm text-muted-foreground mb-1">
                Actual Fines
              </div>
              <div className="text-lg font-bold text-red-600">
                Rs. {totals.actual.toLocaleString()}
              </div>
            </div>
            <div className="text-center min-w-[120px]">
              <div className="text-sm text-muted-foreground mb-1">
                Calculated ({globalMultiplier}x)
              </div>
              <div className="text-lg font-bold text-orange-600">
                Rs. {totals.calculated.toLocaleString()}
              </div>
            </div>
            <div className="text-center min-w-[120px]">
              <div className="text-sm text-muted-foreground mb-1">
                Final Deductible
              </div>
              <div className="text-lg font-bold text-blue-600">
                Rs. {totals.final.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-16 text-center font-semibold">
                  #
                </TableHead>
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Late Time</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">
                  Fine Amount
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Actual Total
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Calculated
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Final Deductible
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {Object.keys(employeeGroups).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-4">
                      <XCircle className="h-16 w-16 text-muted-foreground/40" />
                      <div className="space-y-1">
                        <p className="text-lg font-medium text-muted-foreground">
                          No fines found for this period
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Try selecting a different month or year
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(employeeGroups).map(
                  ([employeeId, group], groupIndex) => {
                    const savedRecord = savedData[employeeId];
                    const hasManualEdit =
                      finalDeductibleAmounts[employeeId] !== undefined;
                    const isOverridden =
                      hasManualEdit &&
                      group.finalDeductible !== group.calculatedDeductible;

                    return group.fines.map((fine, fineIndex) => (
                      <TableRow
                        key={fine.id}
                        className={`
                        ${fineIndex === 0 ? "border-t-2 border-gray-100" : ""}
                        ${fine.status === "waived" ? "bg-gray-50/50" : "hover:bg-gray-50/50"}
                      `}
                      >
                        {/* Row Number */}
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {fineIndex === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                              {groupIndex + 1}
                            </span>
                          ) : null}
                        </TableCell>

                        {/* Employee Info (first row only) */}
                        <TableCell>
                          {fineIndex === 0 && (
                            <div className="space-y-1.5">
                              <div className="font-semibold">
                                {group.employee?.firstName}{" "}
                                {group.employee?.lastName}
                              </div>
                              {savedRecord && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <span>Saved:</span>
                                    <span className="font-medium">
                                      Rs.
                                      {savedRecord.finalDeductibleAmount.toLocaleString()}
                                    </span>
                                  </span>
                                </div>
                              )}
                              {group.hasWaivedFines && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                                >
                                  Has waived fines
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Fine Details */}
                        <TableCell className="font-medium">
                          {format(new Date(fine.date), "dd-MMM-yy")}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-gray-100 border-gray-200 font-medium"
                          >
                            {formatLateTime(fine.lateMinutes)}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {fine.status === "waived" ? (
                            <Badge
                              variant="secondary"
                              className="bg-gray-100 text-gray-700 border-gray-200"
                            >
                              Waived
                            </Badge>
                          ) : (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-700 border-green-200"
                            >
                              Active
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          Rs.{" "}
                          {fine.amount > 0 ? fine.amount.toLocaleString() : "0"}
                        </TableCell>

                        {/* Group Totals (first row only) */}
                        <TableCell className="text-right">
                          {fineIndex === 0 && (
                            <div className="space-y-1">
                              <div className="font-bold text-red-600">
                                Rs. {group.totalAmount.toLocaleString()}
                              </div>
                              {group.hasWaivedFines && (
                                <div className="text-xs text-muted-foreground">
                                  Excludes waived fines
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {fineIndex === 0 && (
                            <div className="space-y-1">
                              <div
                                className={`font-medium ${isOverridden ? "line-through text-muted-foreground" : "text-orange-600"}`}
                              >
                                Rs.{" "}
                                {group.calculatedDeductible.toLocaleString()}
                              </div>
                            </div>
                          )}
                        </TableCell>

                        {/* Final Deductible Input (first row only) */}
                        <TableCell className="text-right">
                          {fineIndex === 0 && (
                            <div className="flex flex-col items-end space-y-2">
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="10"
                                  value={group.finalDeductible || ""}
                                  onChange={(e) =>
                                    updateFinalDeductible(
                                      employeeId,
                                      parseFloat(e.target.value),
                                    )
                                  }
                                  className="w-32 text-right font-medium border-blue-200 focus:border-blue-400"
                                />
                                {hasManualEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => resetEmployee(employeeId)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    Reset
                                  </Button>
                                )}
                              </div>
                              {isOverridden && (
                                <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                                  Manual override
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ));
                  },
                )
              )}

              {/* Totals Row */}
              {Object.keys(employeeGroups).length > 0 && (
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 font-bold border-t-2 border-gray-300">
                  <TableCell colSpan={6} className="text-right text-lg py-4">
                    <div className="pr-4">Grand Total</div>
                  </TableCell>
                  <TableCell className="text-right text-lg text-red-600 py-4">
                    <div>Rs. {totals.actual.toLocaleString()}</div>
                  </TableCell>
                  <TableCell className="text-right text-lg text-orange-600 py-4">
                    <div>Rs. {totals.calculated.toLocaleString()}</div>
                  </TableCell>
                  <TableCell className="text-right text-lg text-blue-600 py-4">
                    <div>Rs. {totals.final.toLocaleString()}</div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
