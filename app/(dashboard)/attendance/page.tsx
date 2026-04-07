"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAlert } from "@/components/ui/use-alert";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar,
  Upload,
  Search,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  ChevronDown,
  TrendingUp,
  User,
  CalendarDays,
  Zap,
  BarChart3,
  Eye,
  MoreVertical,
  Check,
  X,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { format, parseISO, isToday, isSameDay } from "date-fns";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { ImportAttendanceDialog } from "@/components/attendance/import-attendance-dialog";
import { AddAttendanceDialog } from "@/components/attendance/add-attendance-dialog";
import { generateDailySummary } from "@/lib/attendance-utils";
import {
  exportDailyAttendanceToCSV,
  exportDailyAttendanceToExcel,
  exportDailyAttendanceToPDF,
  EmployeeAttendanceData,
} from "@/lib/export-utils";

interface Employee {
  id: string;
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  departmentId: string;
  designation?: string;
  status: string;
  managerId?: string;
  gender?: string;
}

interface Department {
  id: string;
  name: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: string;
  workHours?: number;
  lateMinutes?: number;
  isCompensated?: boolean;
  intimated?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AttendancePage() {
  const { user, hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teamEmployees, setTeamEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [intimatedDialogOpen, setIntimatedDialogOpen] = useState(false);
  const [intimatedReason, setIntimatedReason] = useState("");
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<
    string | null
  >(null);
  const [currentIntimatedStatus, setCurrentIntimatedStatus] = useState(false);
  const [attendanceScope, setAttendanceScope] = useState<"team" | "own">(
    "team",
  );
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const canViewAll = hasPermission("view_all_attendance");
  const canManage = hasPermission("manage_attendance");
  const isManager = user?.role === "manager";
  const isEmployee = user?.role === "employee";

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    if (isManager) {
      fetchTeamEmployees();
      fetchAttendance();
      fetchTeamAttendance();
    } else {
      fetchAttendance();
    }
    if (canViewAll) {
      fetchDailyReport();
    }
  }, [selectedDate, attendanceScope]);

  const fetchEmployees = async () => {
    try {
      const scope =
        isManager && attendanceScope === "own" ? "own" : isEmployee ? "" : "";
      const scopeParam = scope ? `?scope=${scope}` : "";
      const response = await fetch(`/api/employees${scopeParam}`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments");
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      const timestamp = new Date().getTime();
      const scope = isManager ? "own" : undefined;
      const scopeParam = scope ? `&scope=${scope}` : "";
      const response = await fetch(
        `/api/attendance?date=${selectedDate}${scopeParam}&_t=${timestamp}`,
        { cache: "no-store" },
      );
      if (response.ok) {
        const data = await response.json();
        setAttendance(data);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamAttendance = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(
        `/api/attendance?date=${selectedDate}&scope=team&_t=${timestamp}`,
        { cache: "no-store" },
      );
      if (response.ok) {
        const data = await response.json();
        setTeamAttendance(data);
      }
    } catch (error) {
      console.error("Failed to fetch team attendance:", error);
    }
  };

  const fetchTeamEmployees = async () => {
    try {
      const response = await fetch("/api/employees?scope=team");
      if (response.ok) {
        const data = await response.json();
        setTeamEmployees(data);
      }
    } catch (error) {
      console.error("Failed to fetch team employees:", error);
    }
  };

  const fetchDailyReport = async () => {
    try {
      const response = await fetch(
        `/api/attendance/daily-report?date=${selectedDate}`,
      );
      if (response.ok) {
        const data = await response.json();
        setDailyReport(data);
      }
    } catch (error) {
      console.error("Failed to fetch daily report:", error);
    }
  };

  const toggleCompensation = async (
    attendanceId: string,
    currentStatus: boolean,
  ) => {
    setUpdatingId(attendanceId);
    try {
      const response = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompensated: !currentStatus }),
      });

      if (response.ok) {
        showAlert({
          type: "success",
          message: `Compensation ${!currentStatus ? "granted" : "removed"}. ${
            !currentStatus
              ? "Fine removed."
              : "Fine will be created if applicable."
          }`,
        });
        await fetchAttendance();
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to update compensation status",
        });
      }
    } catch (error) {
      console.error("Failed to toggle compensation:", error);
      showAlert({
        type: "error",
        message: "Failed to update compensation status",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleIntimated = async (
    attendanceId: string,
    currentIntimated: boolean,
  ) => {
    if (!currentIntimated) {
      setSelectedAttendanceId(attendanceId);
      setCurrentIntimatedStatus(currentIntimated);
      setIntimatedReason("");
      setIntimatedDialogOpen(true);
    } else {
      await updateIntimatedStatus(attendanceId, false, "");
    }
  };

  const updateIntimatedStatus = async (
    attendanceId: string,
    intimated: boolean,
    reason: string,
  ) => {
    try {
      setUpdatingId(attendanceId);
      const response = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intimated,
          intimatedReason: intimated ? reason : null,
        }),
      });

      if (response.ok) {
        showAlert({
          type: "success",
          message: intimated
            ? "Marked as intimated"
            : "Marked as not intimated",
        });
        await fetchAttendance();
        setIntimatedDialogOpen(false);
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to update intimated status",
        });
      }
    } catch (error) {
      console.error("Failed to toggle intimated:", error);
      showAlert({
        type: "error",
        message: "Failed to update intimated status",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const syncBiometricAttendance = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch("/api/biometric/sync-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (response.ok) {
        const data = await response.json();
        showAlert({
          type: "success",
          message: `Successfully synced ${data.synced} attendance records from biometric system`,
        });
        fetchAttendance();
        if (canViewAll) {
          fetchDailyReport();
        }
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to sync attendance",
        });
      }
    } catch (error) {
      console.error("Failed to sync attendance:", error);
      showAlert({
        type: "error",
        message: "Failed to sync attendance from biometric system",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const visibleEmployees = canViewAll
    ? employees.filter((e) => e.status === "active")
    : isManager && attendanceScope === "team"
      ? teamEmployees.filter((e) => e.status === "active")
      : employees.filter((e) => e.status === "active" && e.userId === user?.id);

  const filteredEmployees = visibleEmployees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment =
      departmentFilter === "all" || emp.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const currentAttendance =
    isManager && attendanceScope === "team" ? teamAttendance : attendance;
  const dayAttendance = currentAttendance.filter(
    (a) => a.date === selectedDate,
  );
  const summary = generateDailySummary(dayAttendance as any);

  const getEmployeeAttendance = (employeeId: string) => {
    return dayAttendance.find((a) => a.employeeId === employeeId);
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status)
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-700 border-gray-200"
        >
          Not Recorded
        </Badge>
      );
    switch (status) {
      case "on_time":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
            On Time
          </Badge>
        );
      case "late":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
            Late
          </Badge>
        );
      case "absent":
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200">
            Absent
          </Badge>
        );
      case "half_day":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
            Half Day
          </Badge>
        );
      case "leave":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
            On Leave
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const buildExportData = (): EmployeeAttendanceData[] => {
    return filteredEmployees.map((employee) => {
      const record = getEmployeeAttendance(employee.id);
      return {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        designation: employee.designation || "N/A",
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
        status: record?.status || "absent",
        lateMinutes: record?.lateMinutes || 0,
        isCompensated: record?.isCompensated || false,
        gender: employee.gender,
        leaveReason: record?.notes,
      };
    });
  };

  const handleExportCSV = () => {
    const exportData = buildExportData();
    exportDailyAttendanceToCSV(exportData, selectedDate);
    showAlert({ message: "CSV report exported successfully", type: "success" });
  };

  const handleExportExcel = () => {
    const exportData = buildExportData();
    exportDailyAttendanceToExcel(exportData, selectedDate);
    showAlert({
      message: "Excel report exported successfully",
      type: "success",
    });
  };

  const handleExportPDF = () => {
    const exportData = buildExportData();
    exportDailyAttendanceToPDF(exportData, selectedDate, {
      totalEmployees: filteredEmployees.length,
      present: summary.onTime + summary.late,
      absent: summary.absent,
      late: summary.late,
      onTime: summary.onTime,
    });
    showAlert({ message: "PDF report exported successfully", type: "success" });
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortConfig) return 0;

    const recordA = getEmployeeAttendance(a.id);
    const recordB = getEmployeeAttendance(b.id);

    switch (sortConfig.key) {
      case "name":
        return sortConfig.direction === "asc"
          ? `${a.firstName} ${a.lastName}`.localeCompare(
              `${b.firstName} ${b.lastName}`,
            )
          : `${b.firstName} ${b.lastName}`.localeCompare(
              `${a.firstName} ${a.lastName}`,
            );
      case "department":
        return sortConfig.direction === "asc"
          ? a.department.localeCompare(b.department)
          : b.department.localeCompare(a.department);
      case "status":
        const statusA = recordA?.status || "absent";
        const statusB = recordB?.status || "absent";
        return sortConfig.direction === "asc"
          ? statusA.localeCompare(statusB)
          : statusB.localeCompare(statusA);
      case "checkIn":
        const timeA = recordA?.checkIn || "";
        const timeB = recordB?.checkIn || "";
        return sortConfig.direction === "asc"
          ? timeA.localeCompare(timeB)
          : timeB.localeCompare(timeA);
      default:
        return 0;
    }
  });

  const renderAttendanceView = (showManagementFeatures: boolean) => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section with Filters */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardContent>
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="w-full">
                  <Label className="text-sm font-medium text-gray-600">
                    Date
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-[#00b576] to-emerald-500 shrink-0">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="flex-1 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                    />
                  </div>
                </div>

                <div className="w-full">
                  <Label className="text-sm font-medium text-gray-600">
                    Search
                  </Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-full border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                    />
                  </div>
                </div>

                {canViewAll && (
                  <div className="w-full">
                    <Label className="text-sm font-medium text-gray-600">
                      Department
                    </Label>
                    <Select
                      value={departmentFilter}
                      onValueChange={setDepartmentFilter}
                    >
                      <SelectTrigger className="w-full mt-1 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                        <div className="flex items-center gap-2">
                          <Filter className="h-3 w-3" />
                          <SelectValue placeholder="All Departments" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="hover:bg-emerald-50">
                          All Departments
                        </SelectItem>
                        {departments.map((dept) => (
                          <SelectItem
                            key={dept.id}
                            value={dept.name}
                            className="hover:bg-emerald-50"
                          >
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Export & Sync Buttons */}
              {(canViewAll || (isManager && showManagementFeatures)) && (
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                  <div className="grid grid-cols-3 sm:flex gap-2 flex-1">
                    <Button
                      onClick={handleExportCSV}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50 hover:text-[#00b576]"
                    >
                      <FileSpreadsheet className="sm:mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">CSV</span>
                    </Button>
                    <Button
                      onClick={handleExportExcel}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50 hover:text-[#00b576]"
                    >
                      <FileText className="sm:mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Excel</span>
                    </Button>
                    <Button
                      onClick={handleExportPDF}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50 hover:text-[#00b576]"
                    >
                      <Download className="sm:mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                  </div>
                  {canManage && (
                    <>
                      <Button
                        onClick={() => setIsAddDialogOpen(true)}
                        size="sm"
                        className="w-full sm:w-auto bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Attendance
                      </Button>
                      <Button
                        onClick={() => setIsImportDialogOpen(true)}
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto border-gray-300 hover:border-[#00b576] hover:bg-emerald-50 hover:text-[#00b576]"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {(canViewAll || (isManager && attendanceScope === "team")) && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5 animate-in fade-in slide-in-from-bottom-4">
          <Card className="group border border-gray-200 hover:border-[#00b576] hover:shadow-lg transition-all duration-300 pt-4 pb-4">
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Employees
                  </p>
                  <p className="text-xl font-bold text-[#1a2937] mt-1">
                    {filteredEmployees.length}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                  <Users className="h-4 w-4 text-[#00b576]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group border border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-300 pt-4 pb-4">
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Present</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">
                    {summary.present}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group border border-gray-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 pt-4 pb-4">
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Late Arrivals
                  </p>
                  <p className="text-xl font-bold text-amber-600 mt-1">
                    {summary.late}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-amber-50 group-hover:bg-amber-100 transition-colors">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group border border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300 pt-4 pb-4">
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">On Leave</p>
                  <p className="text-xl font-bold text-purple-600 mt-1">
                    {summary.leave || 0}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-purple-50 group-hover:bg-purple-100 transition-colors">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group border border-gray-200 hover:border-rose-400 hover:shadow-lg transition-all duration-300 pt-4 pb-4">
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-xl font-bold text-rose-600 mt-1">
                    {summary.absent}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-rose-50 group-hover:bg-rose-100 transition-colors">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats for Manager's Own View or Employee View */}
      {((isManager && attendanceScope === "own") || isEmployee) &&
        dayAttendance.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-4">
            <Card className="group border border-gray-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Status Today
                    </p>
                    <p className="text-2xl font-bold text-[#1a2937] mt-2">
                      <span
                        className={
                          dayAttendance[0].status === "on_time"
                            ? "text-emerald-600"
                            : dayAttendance[0].status === "late"
                              ? "text-amber-600"
                              : "text-rose-600"
                        }
                      >
                        {dayAttendance[0].status === "on_time"
                          ? "On Time"
                          : dayAttendance[0].status === "late"
                            ? "Late"
                            : dayAttendance[0].status === "absent"
                              ? "Absent"
                              : dayAttendance[0].status}
                      </span>
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group border border-gray-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Check In
                    </p>
                    <p className="text-2xl font-bold text-[#1a2937] mt-2">
                      {dayAttendance[0].checkIn || (
                        <span className="text-gray-400">--:--</span>
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-50">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                {dayAttendance[0].lateMinutes &&
                  dayAttendance[0].lateMinutes > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                      <span className="text-xs text-amber-600">
                        {dayAttendance[0].lateMinutes} min late
                      </span>
                    </div>
                  )}
              </CardContent>
            </Card>

            <Card className="group border border-gray-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Check Out
                    </p>
                    <p className="text-2xl font-bold text-[#1a2937] mt-2">
                      {dayAttendance[0].checkOut || (
                        <span className="text-gray-400">--:--</span>
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-purple-50">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* No Record Message for Employees */}
      {((isManager && attendanceScope === "own") || isEmployee) &&
        dayAttendance.length === 0 && (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">
                  No attendance record found for today
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Your attendance has not been recorded yet for{" "}
                  {format(new Date(selectedDate), "MMMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Attendance Table - Only show if there are employees to display */}
      {(filteredEmployees.length > 0 || isLoading) && (
        <Card className="border border-gray-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-linear-to-t from-gray-50 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold text-[#1a2937]">
                {showManagementFeatures
                  ? "Attendance Records"
                  : "Your Attendance"}
              </CardTitle>
              <div className="text-sm text-gray-500">
                Showing {sortedEmployees.length} of {visibleEmployees.length}{" "}
                employees
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-linear-to-t from-gray-50 to-transparent">
                  <TableRow>
                    <TableHead className="font-semibold text-[#1a2937]">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                      >
                        Employee
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">
                      <button
                        onClick={() => handleSort("department")}
                        className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                      >
                        Department
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">
                      <button
                        onClick={() => handleSort("checkIn")}
                        className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                      >
                        Check In
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">
                      Check Out
                    </TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">
                      <button
                        onClick={() => handleSort("status")}
                        className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                      >
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">
                      Late By
                    </TableHead>
                    {showManagementFeatures && (
                      <TableHead className="font-semibold text-[#1a2937]">
                        Compensated
                      </TableHead>
                    )}
                    {showManagementFeatures && (
                      <TableHead className="font-semibold text-[#1a2937]">
                        Intimated
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={showManagementFeatures ? 8 : 6}
                        className="text-center py-12"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-8 w-8 text-[#00b576] animate-spin" />
                          <p className="text-gray-500">
                            Loading attendance data...
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sortedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={showManagementFeatures ? 8 : 6}
                        className="text-center py-12"
                      >
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-3 rounded-full bg-gray-100">
                            <Users className="h-6 w-6 text-gray-400" />
                          </div>
                          <p className="text-gray-600 font-medium">
                            No employees found
                          </p>
                          <p className="text-sm text-gray-500">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedEmployees.map((employee) => {
                      const record = getEmployeeAttendance(employee.id);
                      return (
                        <TableRow
                          key={employee.id}
                          className="group hover:bg-emerald-50/50 transition-colors duration-200"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                <span className="text-sm font-semibold text-emerald-700">
                                  {employee.firstName?.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-[#1a2937] group-hover:text-emerald-700 transition-colors">
                                  {employee.firstName} {employee.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {employee.employeeId}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-gray-50 text-gray-700 border-gray-200"
                            >
                              {employee.department}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span
                                className={
                                  record?.checkIn
                                    ? "font-medium"
                                    : "text-gray-400"
                                }
                              >
                                {record?.checkIn || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span
                                className={
                                  record?.checkOut
                                    ? "font-medium"
                                    : "text-gray-400"
                                }
                              >
                                {record?.checkOut || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(record?.status)}
                          </TableCell>
                          <TableCell>
                            {record?.lateMinutes ? (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 text-amber-600" />
                                <span className="text-sm font-medium text-amber-700">
                                  {record.lateMinutes} min
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          {showManagementFeatures && (
                            <TableCell>
                              {record?.status === "late" ? (
                                canManage && record?.id ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            toggleCompensation(
                                              record.id,
                                              record.isCompensated || false,
                                            )
                                          }
                                          disabled={updatingId === record.id}
                                          className={
                                            record?.isCompensated
                                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                              : "border-gray-300 hover:border-amber-300 hover:bg-amber-50"
                                          }
                                        >
                                          {updatingId === record.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : record?.isCompensated ? (
                                            <>
                                              <Check className="mr-1 h-3 w-3" />
                                              Compensated
                                            </>
                                          ) : (
                                            "Not Compensated"
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          Click to toggle compensation status
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <Badge
                                    className={
                                      record?.isCompensated
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                        : "bg-amber-50 text-amber-800 border-amber-200"
                                    }
                                  >
                                    {record?.isCompensated
                                      ? "Compensated"
                                      : "Not Compensated"}
                                  </Badge>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          )}
                          {showManagementFeatures && (
                            <TableCell>
                              {record?.status === "absent" ? (
                                canManage && record?.id ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            toggleIntimated(
                                              record.id,
                                              record.intimated || false,
                                            )
                                          }
                                          disabled={updatingId === record.id}
                                          className={
                                            record?.intimated
                                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                              : "border-gray-300 hover:border-rose-300 hover:bg-rose-50"
                                          }
                                        >
                                          {updatingId === record.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : record?.intimated ? (
                                            <>
                                              <Check className="mr-1 h-3 w-3" />
                                              Intimated
                                            </>
                                          ) : (
                                            "Mark as Intimated"
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      {record?.intimated &&
                                        (record as any).intimatedReason && (
                                          <TooltipContent>
                                            <p className="max-w-xs">
                                              {(record as any).intimatedReason}
                                            </p>
                                          </TooltipContent>
                                        )}
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          className={
                                            record?.intimated
                                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                              : "bg-rose-50 text-rose-800 border-rose-200"
                                          }
                                        >
                                          {record?.intimated ? "Yes" : "No"}
                                        </Badge>
                                      </TooltipTrigger>
                                      {record?.intimated &&
                                        (record as any).intimatedReason && (
                                          <TooltipContent>
                                            <p className="max-w-xs">
                                              {(record as any).intimatedReason}
                                            </p>
                                          </TooltipContent>
                                        )}
                                    </Tooltip>
                                  </TooltipProvider>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Attendance Management"
        description="Track and manage employee attendance records"
      />

      <div className="p-6 space-y-6">
        {/* Manager: Show Team/My Attendance tabs */}
        {isManager && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <Tabs
                defaultValue="team"
                onValueChange={(v) => setAttendanceScope(v as "team" | "own")}
                className="w-full"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <TabsList className="bg-gray-100 p-1">
                    <TabsTrigger
                      value="team"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Team Attendance
                    </TabsTrigger>
                    <TabsTrigger
                      value="own"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                    >
                      <User className="mr-2 h-4 w-4" />
                      My Attendance
                    </TabsTrigger>
                  </TabsList>
                  {attendanceScope === "team" && (
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-sm font-medium text-emerald-700">
                          {format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <TabsContent
                  value="team"
                  className="space-y-4 animate-in fade-in"
                >
                  {renderAttendanceView(true)}
                </TabsContent>

                <TabsContent
                  value="own"
                  className="space-y-4 animate-in fade-in"
                >
                  {renderAttendanceView(false)}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {/* Employee: Show only their own attendance */}
        {isEmployee && renderAttendanceView(false)}

        {/* HR/Super Admin: Show full view with all tabs */}
        {canViewAll && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <Tabs defaultValue="daily" className="w-full">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                  <TabsList className="bg-gray-100 p-1">
                    <TabsTrigger
                      value="daily"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Daily View
                    </TabsTrigger>
                    {/*  <TabsTrigger 
                      value="calendar" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Calendar View
                    </TabsTrigger> */}
                    <TabsTrigger
                      value="report"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Daily Report
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3 py-1.5 bg-gradient-to-r from-[#1a2937] to-[#2d4158] rounded-lg">
                      <p className="text-sm font-medium text-white">
                        {format(new Date(selectedDate), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={syncBiometricAttendance}
                      disabled={isSyncing}
                      className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50 hover:text-[#00b576]"
                    >
                      <Zap
                        className={`mr-2 h-4 w-4 ${isSyncing ? "animate-pulse" : ""}`}
                      />
                      {isSyncing ? "Syncing..." : "Sync Biometric"}
                    </Button>
                  </div>
                </div>

                <TabsContent
                  value="daily"
                  className="space-y-4 animate-in fade-in"
                >
                  {renderAttendanceView(true)}
                </TabsContent>

                <TabsContent value="calendar" className="animate-in fade-in">
                  <AttendanceCalendar
                    employeeId={canViewAll ? undefined : user?.id}
                    showEmployeeSelector={canViewAll}
                  />
                </TabsContent>

                {canViewAll && (
                  <TabsContent
                    value="report"
                    className="space-y-6 animate-in fade-in"
                  >
                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Card className="group border border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-300">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                On Approved Leave
                              </p>
                              <p className="text-2xl font-bold text-emerald-600 mt-2">
                                {dailyReport?.summary.onApprovedLeave || 0}
                              </p>
                            </div>
                            <div className="p-3 rounded-full bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="group border border-gray-200 hover:border-rose-400 hover:shadow-lg transition-all duration-300">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Absent Without Leave
                              </p>
                              <p className="text-2xl font-bold text-rose-600 mt-2">
                                {dailyReport?.summary.absentWithoutLeave || 0}
                              </p>
                            </div>
                            <div className="p-3 rounded-full bg-rose-50 group-hover:bg-rose-100 transition-colors">
                              <AlertTriangle className="h-5 w-5 text-rose-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="group border border-gray-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Pending Leave
                              </p>
                              <p className="text-2xl font-bold text-amber-600 mt-2">
                                {dailyReport?.summary.withPendingLeave || 0}
                              </p>
                            </div>
                            <div className="p-3 rounded-full bg-amber-50 group-hover:bg-amber-100 transition-colors">
                              <Clock className="h-5 w-5 text-amber-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Lists */}
                    <Tabs defaultValue="approved" className="space-y-4">
                      <TabsList className="bg-gray-100 p-1">
                        <TabsTrigger
                          value="approved"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
                        >
                          Approved Leaves (
                          {dailyReport?.summary.onApprovedLeave || 0})
                        </TabsTrigger>
                        <TabsTrigger
                          value="absent"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-rose-600 data-[state=active]:text-white"
                        >
                          Not Applied Leaves (
                          {dailyReport?.summary.absentWithoutLeave || 0})
                        </TabsTrigger>
                        <TabsTrigger
                          value="pending"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white"
                        >
                          Applied Leave (
                          {dailyReport?.summary.withPendingLeave || 0})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="approved">
                        <Card>
                          <CardHeader className="bg-gradient-to-r from-emerald-50 to-white border-b">
                            <CardTitle className="text-lg font-bold text-emerald-800">
                              Employees on Approved Leave
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-6">
                            {!dailyReport ||
                            dailyReport.onApprovedLeave.length === 0 ? (
                              <div className="text-center py-12">
                                <div className="p-3 rounded-full bg-emerald-50 inline-flex mb-3">
                                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                                </div>
                                <p className="text-gray-600 font-medium">
                                  No employees on approved leave
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {dailyReport.onApprovedLeave.map((emp: any) => (
                                  <div
                                    key={emp.id}
                                    className="group p-4 rounded-lg border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/50 hover:border-emerald-200 transition-all duration-300"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                          <span className="text-sm font-bold text-emerald-700">
                                            {emp.name?.charAt(0) || "E"}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="font-medium text-[#1a2937]">
                                            {emp.name}
                                          </p>
                                          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                            <span>{emp.department}</span>
                                            <span>•</span>
                                            <span>{emp.designation}</span>
                                            <span>•</span>
                                            <span className="font-medium text-emerald-700">
                                              {format(
                                                new Date(emp.leaveStartDate),
                                                "MMM dd",
                                              )}{" "}
                                              -{" "}
                                              {format(
                                                new Date(emp.leaveEndDate),
                                                "MMM dd",
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 capitalize">
                                        {emp.leaveType}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="absent">
                        <Card>
                          <CardHeader className="bg-gradient-to-r from-rose-50 to-white border-b">
                            <CardTitle className="text-lg font-bold text-rose-800">
                              Absent Without Leave
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-6">
                            {!dailyReport ||
                            dailyReport.absentWithoutLeave.length === 0 ? (
                              <div className="text-center py-12">
                                <div className="p-3 rounded-full bg-rose-50 inline-flex mb-3">
                                  <CheckCircle2 className="h-6 w-6 text-rose-400" />
                                </div>
                                <p className="text-gray-600 font-medium">
                                  No employees absent without leave
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {dailyReport.absentWithoutLeave.map(
                                  (emp: any) => (
                                    <div
                                      key={emp.id}
                                      className="group p-4 rounded-lg border border-rose-100 bg-rose-50/50 hover:bg-rose-100/50 hover:border-rose-200 transition-all duration-300"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center">
                                            <span className="text-sm font-bold text-rose-700">
                                              {emp.name?.charAt(0) || "E"}
                                            </span>
                                          </div>
                                          <div>
                                            <p className="font-medium text-[#1a2937]">
                                              {emp.name}
                                            </p>
                                            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                              <span>{emp.department}</span>
                                              <span>•</span>
                                              <span>{emp.designation}</span>
                                            </div>
                                          </div>
                                        </div>
                                        <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                                          {emp.attendanceStatus === "not_marked"
                                            ? "Not Marked"
                                            : "Absent"}
                                        </Badge>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="pending">
                        <Card>
                          <CardHeader className="bg-gradient-to-r from-amber-50 to-white border-b">
                            <CardTitle className="text-lg font-bold text-amber-800">
                              Employees with Pending Leave
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-6">
                            {!dailyReport ||
                            dailyReport.withPendingLeave.length === 0 ? (
                              <div className="text-center py-12">
                                <div className="p-3 rounded-full bg-amber-50 inline-flex mb-3">
                                  <Clock className="h-6 w-6 text-amber-400" />
                                </div>
                                <p className="text-gray-600 font-medium">
                                  No employees with pending leave
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {dailyReport.withPendingLeave.map(
                                  (emp: any) => (
                                    <div
                                      key={emp.id}
                                      className="group p-4 rounded-lg border border-amber-100 bg-amber-50/50 hover:bg-amber-100/50 hover:border-amber-200 transition-all duration-300"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                                            <span className="text-sm font-bold text-amber-700">
                                              {emp.name?.charAt(0) || "E"}
                                            </span>
                                          </div>
                                          <div>
                                            <p className="font-medium text-[#1a2937]">
                                              {emp.name}
                                            </p>
                                            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                              <span>{emp.department}</span>
                                              <span>•</span>
                                              <span>{emp.designation}</span>
                                              <span>•</span>
                                              <span className="font-medium text-amber-700">
                                                {format(
                                                  new Date(emp.leaveStartDate),
                                                  "MMM dd",
                                                )}{" "}
                                                -{" "}
                                                {format(
                                                  new Date(emp.leaveEndDate),
                                                  "MMM dd",
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 capitalize">
                                            {emp.leaveType}
                                          </Badge>
                                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 capitalize">
                                            {emp.leaveStatus.replace("_", " ")}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        )}
      </div>

      <ImportAttendanceDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSuccess={fetchAttendance}
      />

      <AddAttendanceDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchAttendance}
      />

      <Dialog open={intimatedDialogOpen} onOpenChange={setIntimatedDialogOpen}>
        <DialogContent className="border border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Mark as Intimated
            </DialogTitle>
            <DialogDescription>
              Please provide the reason why the employee informed you about
              their absence.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-gray-700">
                Reason
              </Label>
              <Textarea
                id="reason"
                placeholder="e.g., Called in sick, Family emergency, etc."
                value={intimatedReason}
                onChange={(e) => setIntimatedReason(e.target.value)}
                rows={4}
                className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIntimatedDialogOpen(false)}
              className="border-gray-300 hover:border-gray-400"
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
              disabled={!intimatedReason.trim()}
              className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
