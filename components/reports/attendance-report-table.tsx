"use client";

import { useState, useMemo } from "react";
import { AttendanceRecord, Employee } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAlert } from "@/components/ui/use-alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  Filter,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Loader2,
  Calendar,
  Building,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AttendanceReportTableProps {
  attendance: AttendanceRecord[];
  employees: Employee[];
  canManage?: boolean;
  onUpdate?: () => void;
  dateRange?: { start: Date; end: Date };
}

type FilterType = "all" | "late" | "absent" | "on_time" | "half_day";

export function AttendanceReportTable({
  attendance,
  employees,
  canManage = false,
  onUpdate,
  dateRange,
}: AttendanceReportTableProps) {
  const { showAlert } = useAlert();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [intimatedDialogOpen, setIntimatedDialogOpen] = useState(false);
  const [intimatedReason, setIntimatedReason] = useState("");
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<
    string | null
  >(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");

  // Statistics calculation
  const stats = useMemo(() => {
    const total = attendance.length;
    const late = attendance.filter((r) => r.status === "late").length;
    const absent = attendance.filter((r) => r.status === "absent").length;
    const onTime = attendance.filter((r) => r.status === "on_time").length;
    const halfDay = attendance.filter((r) => r.status === "half_day").length;

    const intimatedAbsences = attendance.filter(
      (r) => r.status === "absent" && r.intimated,
    ).length;

    const compensatedLates = attendance.filter(
      (r) => r.status === "late" && r.isCompensated,
    ).length;

    return {
      total,
      late,
      absent,
      onTime,
      halfDay,
      intimatedAbsences,
      compensatedLates,
      latePercentage: total > 0 ? Math.round((late / total) * 100) : 0,
      absentPercentage: total > 0 ? Math.round((absent / total) * 100) : 0,
    };
  }, [attendance]);

  // Filter attendance records
  const filteredAttendance = useMemo(() => {
    let filtered = [...attendance];

    if (activeFilter !== "all") {
      filtered = filtered.filter((record) => record.status === activeFilter);
    }

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [attendance, activeFilter]);

  // Get employee info
  const getEmployeeInfo = (employeeId: string) => {
    return employees.find((e) => e.id === employeeId);
  };

  // Toggle compensation
  const toggleCompensation = async (
    attendanceId: string,
    currentStatus: boolean,
  ) => {
    setUpdatingId(attendanceId);
    try {
      const response = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCompensated: !currentStatus,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        showAlert({
          type: "success",
          title: !currentStatus
            ? "Compensation Granted"
            : "Compensation Removed",
          message: !currentStatus
            ? "Late compensation granted and fine removed."
            : "Compensation removed. Fine will be applied if applicable.",
        });
        onUpdate?.();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update compensation");
      }
    } catch (error) {
      showAlert({
        type: "error",
        title: "Update Failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update compensation status",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle intimated status
  const toggleIntimated = async (
    attendanceId: string,
    currentStatus: boolean,
  ) => {
    if (!currentStatus) {
      setSelectedAttendanceId(attendanceId);
      setIntimatedReason("");
      setIntimatedDialogOpen(true);
    } else {
      await updateIntimatedStatus(attendanceId, false, "");
    }
  };

  // Update intimated status
  const updateIntimatedStatus = async (
    attendanceId: string,
    intimated: boolean,
    reason: string,
  ) => {
    setUpdatingId(attendanceId);
    try {
      const response = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intimated,
          intimatedReason: intimated ? reason.trim() : null,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        showAlert({
          type: "success",
          title: intimated ? "Marked as Intimated" : "Intimation Removed",
          message: intimated
            ? "Absence has been marked as intimated."
            : "Intimation status has been removed.",
        });
        onUpdate?.();
        setIntimatedDialogOpen(false);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update intimation status");
      }
    } catch (error) {
      showAlert({
        type: "error",
        title: "Update Failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update intimation status",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Status badge with improved styling
  const getStatusBadge = (status: string, lateMinutes?: number) => {
    const commonClasses = "font-medium px-2.5 py-1 rounded-full text-xs";

    switch (status) {
      case "on_time":
        return (
          <Badge
            className={`${commonClasses} bg-green-100 text-green-800 border-green-200`}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            On Time
          </Badge>
        );
      case "late":
        return (
          <div className="flex items-center gap-2">
            <Badge
              className={`${commonClasses} bg-amber-100 text-amber-800 border-amber-200`}
            >
              <Clock className="w-3 h-3 mr-1" />
              Late
            </Badge>
            {lateMinutes && lateMinutes > 0 && (
              <span className="text-xs text-muted-foreground">
                ({lateMinutes} min)
              </span>
            )}
          </div>
        );
      case "absent":
        return (
          <Badge
            className={`${commonClasses} bg-red-100 text-red-800 border-red-200`}
          >
            <UserX className="w-3 h-3 mr-1" />
            Absent
          </Badge>
        );
      case "half_day":
        return (
          <Badge
            className={`${commonClasses} bg-blue-100 text-blue-800 border-blue-200`}
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Half Day
          </Badge>
        );
      case "leave":
        return (
          <Badge
            className={`${commonClasses} bg-purple-100 text-purple-800 border-purple-200`}
          >
            <Calendar className="w-3 h-3 mr-1" />
            On Leave
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format time for display
  const formatTime = (time?: string) => {
    if (!time) return "-";
    return format(new Date(`2000-01-01T${time}`), "h:mm a");
  };

  // Get date range display
  const dateRangeDisplay = dateRange
    ? `${format(dateRange.start, "MMM dd")} - ${format(dateRange.end, "MMM dd, yyyy")}`
    : null;

  return (
    <>
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b pb-4">
          <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Attendance Report</CardTitle>
                {dateRangeDisplay && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {dateRangeDisplay}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg p-1 bg-gray-50">
                <Button
                  variant={viewMode === "detailed" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("detailed")}
                  className="h-8 px-3"
                >
                  Detailed
                </Button>
                <Button
                  variant={viewMode === "compact" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("compact")}
                  className="h-8 px-3"
                >
                  Compact
                </Button>
              </div>

              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                    <Badge variant="secondary" className="ml-1">
                      {activeFilter === "all" ? "All" : activeFilter}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setActiveFilter("all")}>
                    All Records ({attendance.length})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("on_time")}>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    On Time ({stats.onTime})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("late")}>
                    <Clock className="h-4 w-4 mr-2 text-amber-600" />
                    Late ({stats.late})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("absent")}>
                    <UserX className="h-4 w-4 mr-2 text-red-600" />
                    Absent ({stats.absent})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter("half_day")}>
                    <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
                    Half Day ({stats.halfDay})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Statistics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-4 mt-4 border-t">
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">
                Total Records
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground mb-1">Late</div>
                <Badge variant="outline" className="text-xs">
                  {stats.latePercentage}%
                </Badge>
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {stats.late}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.compensatedLates} compensated
              </div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground mb-1">Absent</div>
                <Badge variant="outline" className="text-xs">
                  {stats.absentPercentage}%
                </Badge>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {stats.absent}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.intimatedAbsences} intimated
              </div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">On Time</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.onTime}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">
                Half Days
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.halfDay}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">
                Intimation Rate
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.absent > 0
                  ? Math.round((stats.intimatedAbsences / stats.absent) * 100)
                  : 0}
                %
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  {viewMode === "detailed" ? (
                    <>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Date
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          Employee
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          Department
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Check In</TableHead>
                      <TableHead className="font-semibold">Check Out</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">
                        Compensated
                      </TableHead>
                      <TableHead className="font-semibold">Intimated</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Details</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        viewMode === "detailed"
                          ? canManage
                            ? 9
                            : 8
                          : canManage
                            ? 4
                            : 3
                      }
                      className="text-center py-12"
                    >
                      <div className="flex flex-col items-center space-y-4">
                        <UserX className="h-16 w-16 text-muted-foreground/40" />
                        <div className="space-y-1">
                          <p className="text-lg font-medium text-muted-foreground">
                            No attendance records found
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activeFilter !== "all"
                              ? `No ${activeFilter.replace("_", " ")} records for this period`
                              : "Try selecting a different filter or period"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendance.map((record) => {
                    const employee = getEmployeeInfo(record.employeeId);
                    const isUpdating = updatingId === record.id;

                    return (
                      <TableRow
                        key={record.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        {/* Date */}
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>
                              {format(new Date(record.date), "MMM d, yyyy")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(record.date), "EEE")}
                            </span>
                          </div>
                        </TableCell>

                        {/* Employee Info */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {employee?.firstName} {employee?.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {employee?.employeeId || "N/A"}
                            </div>
                          </div>
                        </TableCell>

                        {viewMode === "detailed" && (
                          <>
                            {/* Department */}
                            <TableCell>
                              <Badge variant="outline" className="bg-gray-50">
                                {employee?.department || "N/A"}
                              </Badge>
                            </TableCell>

                            {/* Check In */}
                            <TableCell>
                              <div
                                className={`font-medium ${record.checkIn ? "text-green-600" : "text-muted-foreground"}`}
                              >
                                {formatTime(record.checkIn)}
                              </div>
                            </TableCell>

                            {/* Check Out */}
                            <TableCell>
                              <div
                                className={`font-medium ${record.checkOut ? "text-blue-600" : "text-muted-foreground"}`}
                              >
                                {formatTime(record.checkOut)}
                              </div>
                            </TableCell>
                          </>
                        )}

                        {/* Status */}
                        <TableCell>
                          {getStatusBadge(record.status, record.lateMinutes)}
                        </TableCell>

                        {viewMode === "detailed" && (
                          <>
                            {/* Compensated Status */}
                            <TableCell>
                              {record.status === "late" ? (
                                <div className="flex items-center">
                                  {canManage ? (
                                    <Button
                                      variant={
                                        record.isCompensated
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        toggleCompensation(
                                          record.id,
                                          record.isCompensated || false,
                                        )
                                      }
                                      disabled={isUpdating}
                                      className="min-w-[140px] justify-start"
                                    >
                                      {isUpdating ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : record.isCompensated ? (
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                      ) : (
                                        <XCircle className="h-4 w-4 mr-2" />
                                      )}
                                      {record.isCompensated
                                        ? "Compensated"
                                        : "Not Compensated"}
                                    </Button>
                                  ) : (
                                    <Badge
                                      variant={
                                        record.isCompensated
                                          ? "success"
                                          : "outline"
                                      }
                                      className="min-w-[140px] justify-center"
                                    >
                                      {record.isCompensated
                                        ? "Compensated"
                                        : "Not Compensated"}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>

                            {/* Intimated Status */}
                            <TableCell>
                              {record.status === "absent" ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        {canManage ? (
                                          <Button
                                            variant={
                                              record.intimated
                                                ? "default"
                                                : "outline"
                                            }
                                            size="sm"
                                            onClick={() =>
                                              toggleIntimated(
                                                record.id,
                                                record.intimated || false,
                                              )
                                            }
                                            disabled={isUpdating}
                                            className="min-w-[140px] justify-start"
                                          >
                                            {isUpdating ? (
                                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : record.intimated ? (
                                              <CheckCircle2 className="h-4 w-4 mr-2" />
                                            ) : (
                                              <AlertCircle className="h-4 w-4 mr-2" />
                                            )}
                                            {record.intimated
                                              ? "Intimated"
                                              : "Mark Intimated"}
                                          </Button>
                                        ) : (
                                          <Badge
                                            variant={
                                              record.intimated
                                                ? "success"
                                                : "outline"
                                            }
                                            className="min-w-[140px] justify-center"
                                          >
                                            {record.intimated
                                              ? "Intimated"
                                              : "Not Intimated"}
                                          </Badge>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    {record.intimated &&
                                      record.intimatedReason && (
                                        <TooltipContent
                                          side="left"
                                          className="max-w-xs"
                                        >
                                          <div className="space-y-1">
                                            <p className="font-medium">
                                              Intimation Reason:
                                            </p>
                                            <p className="text-sm">
                                              {record.intimatedReason}
                                            </p>
                                          </div>
                                        </TooltipContent>
                                      )}
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </>
                        )}

                        {viewMode === "compact" && (
                          <TableCell>
                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  In:{" "}
                                </span>
                                {formatTime(record.checkIn)}
                                <span className="mx-2">•</span>
                                <span className="text-muted-foreground">
                                  Out:{" "}
                                </span>
                                {formatTime(record.checkOut)}
                              </div>
                              {record.status === "late" && (
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      record.isCompensated
                                        ? "success"
                                        : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {record.isCompensated
                                      ? "Compensated"
                                      : "Not Compensated"}
                                  </Badge>
                                </div>
                              )}
                              {record.status === "absent" && (
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      record.intimated ? "success" : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {record.intimated
                                      ? "Intimated"
                                      : "Not Intimated"}
                                  </Badge>
                                  {record.intimated &&
                                    record.intimatedReason && (
                                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {record.intimatedReason}
                                      </span>
                                    )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer Summary */}
          {filteredAttendance.length > 0 && (
            <div className="border-t bg-gray-50 px-6 py-3">
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium">
                    {filteredAttendance.length}
                  </span>{" "}
                  of <span className="font-medium">{attendance.length}</span>{" "}
                  records
                  {activeFilter !== "all" && (
                    <span className="ml-2">
                      (filtered by {activeFilter.replace("_", " ")})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>On Time: {stats.onTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span>Late: {stats.late}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Absent: {stats.absent}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intimation Dialog */}
      <Dialog open={intimatedDialogOpen} onOpenChange={setIntimatedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Mark Absence as Intimated
            </DialogTitle>
            <DialogDescription>
              Please provide the reason for intimation. This will be recorded
              against the attendance record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="font-medium">
                Intimation Reason
              </Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for absence (e.g., Sick leave, Personal emergency, Family event, etc.)"
                value={intimatedReason}
                onChange={(e) => setIntimatedReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This information will be saved with the attendance record.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIntimatedDialogOpen(false);
                setIntimatedReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAttendanceId) {
                  updateIntimatedStatus(
                    selectedAttendanceId,
                    true,
                    intimatedReason,
                  );
                }
              }}
              disabled={
                !intimatedReason.trim() || updatingId === selectedAttendanceId
              }
            >
              {updatingId === selectedAttendanceId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Mark as Intimated"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
