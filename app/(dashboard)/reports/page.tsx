"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Calendar,
  Users,
  Clock,
  DollarSign,
  FileSpreadsheet,
  TrendingUp,
  Filter,
  RefreshCw,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import * as XLSX from "xlsx";
import { AttendanceReportTable } from "@/components/reports/attendance-report-table";
import { LeaveReportTable } from "@/components/reports/leave-report-table";
import {
  FineReportTable,
  DeductibleFineData,
} from "@/components/reports/fine-report-table";
import { calculateAttendanceStats } from "@/lib/attendance-utils";

export default function ReportsPage() {
  const { hasPermission, user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [reportType, setReportType] = useState("attendance");
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("all");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");

  // Fines-specific month/year filter (defaults to current month)
  const [finesMonth, setFinesMonth] = useState<number>(
    new Date().getMonth() + 1,
  ); // 1-12
  const [finesYear, setFinesYear] = useState<number>(new Date().getFullYear());

  // Calculate date range from month/year for filtering
  const finesDateFrom = new Date(finesYear, finesMonth - 1, 1);
  const finesDateTo = endOfMonth(finesDateFrom);

  // Store deductible fines data from the table for export
  const [deductibleFinesData, setDeductibleFinesData] = useState<
    DeductibleFineData[]
  >([]);

  const canViewReports = hasPermission("view_reports");
  const canManage = ["super_admin", "hr_manager"].includes(user?.role || "");

  // Fetch all data on mount and when date range changes
  useEffect(() => {
    if (canViewReports) {
      fetchAllData();
    }
  }, [canViewReports, dateRange]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchEmployees(),
        fetchAttendance(),
        fetchLeaveRequests(),
        fetchFines(),
        fetchDepartments(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const fetchAttendance = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(
        `/api/attendance?startDate=${dateRange.start}&endDate=${dateRange.end}&_t=${timestamp}`,
        {
          cache: "no-store",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setAttendance(data);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch("/api/leaves");
      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
    }
  };

  const fetchFines = async () => {
    try {
      const response = await fetch("/api/fines");
      if (response.ok) {
        const data = await response.json();
        setFines(data);
      }
    } catch (error) {
      console.error("Failed to fetch fines:", error);
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

  if (!canViewReports) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <div className="p-4 rounded-full bg-rose-100 mx-auto w-20 h-20 flex items-center justify-center">
            <BarChart3 className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">
            You don't have permission to view reports.
          </p>
        </div>
      </div>
    );
  }

  // Filter data by date range, department, and employee search
  const filteredEmployees = employees.filter((e) => {
    const matchesDepartment =
      departmentFilter === "all" || e.department === departmentFilter;
    const searchTerm = employeeSearch.trim().toLowerCase();
    const fullName = `${e.firstName || ""} ${e.lastName || ""}`
      .trim()
      .toLowerCase();
    const matchesEmployee =
      searchTerm === "" ||
      fullName.includes(searchTerm) ||
      (e.employeeId || "").toLowerCase().includes(searchTerm) ||
      (e.firstName || "").toLowerCase().includes(searchTerm) ||
      (e.lastName || "").toLowerCase().includes(searchTerm);

    return matchesDepartment && matchesEmployee;
  });

  const filteredAttendance = attendance.filter(
    (a) =>
      a.date >= dateRange.start &&
      a.date <= dateRange.end &&
      filteredEmployees.some((e) => e.id === a.employeeId) &&
      (attendanceStatusFilter === "all" || a.status === attendanceStatusFilter),
  );

  const filteredLeaves = leaveRequests.filter(
    (l) =>
      l.startDate <= dateRange.end &&
      l.endDate >= dateRange.start &&
      filteredEmployees.some((e) => e.id === l.employeeId) &&
      (leaveStatusFilter === "all" || l.status === leaveStatusFilter),
  );

  // Filter fines by the fines-specific date range
  const filteredFines = fines.filter((f) => {
    const matchesDepartment = filteredEmployees.some(
      (e) => e.id === f.employeeId,
    );

    // Apply fines-specific date range filter
    let matchesDateRange = true;
    if (finesDateFrom || finesDateTo) {
      const fineDate = parseISO(f.date);
      if (finesDateFrom && finesDateTo) {
        matchesDateRange = isWithinInterval(fineDate, {
          start: finesDateFrom,
          end: finesDateTo,
        });
      } else if (finesDateFrom) {
        matchesDateRange = fineDate >= finesDateFrom;
      } else if (finesDateTo) {
        matchesDateRange = fineDate <= finesDateTo;
      }
    }

    return matchesDepartment && matchesDateRange;
  });

  // Calculate summary stats
  const stats = calculateAttendanceStats(filteredAttendance);
  const totalFines = filteredFines
    .filter((f) => f.status === "approved")
    .reduce((sum, f) => sum + f.amount, 0);
  const approvedLeaves = filteredLeaves.filter(
    (l) => l.status === "approved",
  ).length;

  // Helper function to format late minutes for display
  const formatLateTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) return `${hours}hr`;
      return `${hours}hr ${mins} mins`;
    }
    return `${minutes} min${minutes !== 1 ? "s" : ""}`;
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      let filename = "";

      if (reportType === "attendance") {
        const data = filteredAttendance.map((a) => {
          const emp = employees.find((e) => e.id === a.employeeId);
          return {
            "Employee ID": emp?.employeeId,
            "Employee Name": `${emp?.firstName} ${emp?.lastName}`,
            Department: emp?.department,
            Date: a.date,
            "Check In": a.checkIn || "-",
            "Check Out": a.checkOut || "-",
            Status: a.status,
            "Late Minutes": a.lateMinutes || 0,
            Compensated: a.isCompensated ? "Yes" : "No",
          };
        });
        filename = `attendance_report_${dateRange.start}_${dateRange.end}.xlsx`;

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, filename);
      } else if (reportType === "leave") {
        const data = filteredLeaves.map((l) => {
          const emp = employees.find((e) => e.id === l.employeeId);
          return {
            "Employee ID": emp?.employeeId,
            "Employee Name": `${emp?.firstName} ${emp?.lastName}`,
            Department: emp?.department,
            "Leave Type": l.leaveType,
            "Start Date": l.startDate,
            "End Date": l.endDate,
            Status: l.status,
            Reason: l.reason,
          };
        });
        filename = `leave_report_${dateRange.start}_${dateRange.end}.xlsx`;

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, filename);
      } else if (reportType === "fines") {
        // Export in Late Penalty Voucher format matching Report.xlsx
        const monthName = finesDateFrom
          ? format(finesDateFrom, "MMM'yyyy")
          : format(new Date(), "MMM'yyyy");
        filename = `Late_Penalty_Voucher_${monthName}.xlsx`;

        // Helper to format fine type for display
        const formatFineType = (type: string) => {
          const typeMap: Record<string, string> = {
            late_arrival: "Late Arrival",
            policy_violation: "Policy Violation",
            misconduct: "Misconduct",
            other: "Other",
          };
          return typeMap[type] || type;
        };

        // Helper to format waived status
        const formatWaivedStatus = (status: string) => {
          return status === "waived" ? "Waived" : "Active";
        };

        // Build worksheet data matching original format
        const ws_data: (string | number | null)[][] = [];

        // Title rows
        ws_data.push([
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "Late Penalty Voucher",
          monthName,
        ]);
        ws_data.push([`Late Penalty Voucher for the Month of ${monthName}`]);
        ws_data.push([
          "Deduction of Late Penalty as per the detail mentioned against each:",
        ]);

        // Header row with all columns including Waived Status
        ws_data.push([
          "Sr #",
          "MP #",
          "Name",
          "Date",
          "Late Time",
          "Fine Type",
          "Fine Reason",
          "Waived Status",
          "Actual Fine",
          "Total Actual Amount",
          "Calculated Deductible",
          "Final Deductible (Rs.)",
        ]);

        // Group ALL fines by employee (including waived for display)
        // But only count non-waived fines in calculations
        const groupedFines: Record<
          string,
          { employee: any; fines: any[]; totalAmount: number }
        > = {};
        filteredFines.forEach((fine) => {
          if (!groupedFines[fine.employeeId]) {
            const employee = employees.find((e) => e.id === fine.employeeId);
            groupedFines[fine.employeeId] = {
              employee,
              fines: [],
              totalAmount: 0,
            };
          }
          groupedFines[fine.employeeId].fines.push(fine);
          // Only add to totalAmount if fine is NOT waived
          if (fine.status !== "waived") {
            groupedFines[fine.employeeId].totalAmount += fine.amount;
          }
        });

        // Sort fines within each group by date
        Object.values(groupedFines).forEach((group) => {
          group.fines.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
        });

        let srNo = 1;
        let grandTotalActual = 0;
        let grandTotalCalculated = 0;
        let grandTotalFinal = 0;

        Object.entries(groupedFines).forEach(([employeeId, group]) => {
          // Find this employee's deductible data
          const deductibleData = deductibleFinesData.find(
            (d) => d.employeeId === employeeId,
          );
          // totalAmount already excludes waived fines
          const calculatedAmount =
            deductibleData?.deductibleAmount || group.totalAmount * 2; // Default 2x
          const finalAmount =
            deductibleData?.finalDeductibleAmount || calculatedAmount;

          // Only add to grand totals (these already exclude waived fines via totalAmount)
          grandTotalActual += group.totalAmount;
          grandTotalCalculated += calculatedAmount;
          grandTotalFinal += finalAmount;

          group.fines.forEach((fine, index) => {
            // Only show late time for late_arrival type fines
            const lateTimeDisplay =
              fine.type === "late_arrival"
                ? formatLateTime(fine.lateMinutes)
                : null;

            ws_data.push([
              index === 0 ? srNo : null, // Sr #
              null, // MP # (not used)
              index === 0
                ? `${group.employee?.firstName} ${group.employee?.lastName}`
                : null, // Name
              format(new Date(fine.date), "d-MMM-yy"), // Date
              lateTimeDisplay, // Late Time (only for late_arrival)
              formatFineType(fine.type || "late_arrival"), // Fine Type
              fine.reason || "-", // Fine Reason
              formatWaivedStatus(fine.status), // Waived Status
              fine.amount > 0 ? fine.amount : 0, // Actual Fine (show original amount even if waived)
              index === 0 ? group.totalAmount : null, // Total Actual Amount (excludes waived)
              index === 0 ? calculatedAmount : null, // Calculated Deductible (excludes waived)
              index === 0 ? finalAmount : null, // Final Deductible (excludes waived)
            ]);
          });

          srNo++;
        });

        // Grand Total row (all totals exclude waived fines)
        ws_data.push([
          "Grand Total",
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          grandTotalActual,
          grandTotalCalculated,
          grandTotalFinal,
        ]);

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(ws_data);

        // Set column widths for all 12 columns
        ws["!cols"] = [
          { wch: 8 }, // Sr#
          { wch: 8 }, // MP#
          { wch: 22 }, // Name
          { wch: 12 }, // Date
          { wch: 14 }, // Late Time
          { wch: 16 }, // Fine Type
          { wch: 30 }, // Fine Reason
          { wch: 12 }, // Waived Status
          { wch: 12 }, // Actual Fine
          { wch: 18 }, // Total Actual Amount
          { wch: 20 }, // Calculated Deductible
          { wch: 20 }, // Final Deductible
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Late Penalty Voucher");
        XLSX.writeFile(wb, filename);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header
        title="Reports & Analytics"
        description="Generate and export detailed HR reports"
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4">
          <Card className="group border border-gray-200 hover:border-emerald-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Attendance Records
                  </p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">
                    {filteredAttendance.length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                  <Calendar className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {dateRange.start} to {dateRange.end}
              </p>
            </CardContent>
          </Card>

          <Card className="group border border-gray-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Late Arrivals
                  </p>
                  <p className="text-3xl font-bold text-amber-600 mt-2">
                    {stats.lateDays}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-amber-50 group-hover:bg-amber-100 transition-colors">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.totalLateMinutes} total minutes late
              </p>
            </CardContent>
          </Card>

          <Card className="group border border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Approved Leaves
                  </p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {approvedLeaves}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Approved leave requests
              </p>
            </CardContent>
          </Card>

          <Card className="group border border-gray-200 hover:border-rose-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Fines
                  </p>
                  <p className="text-3xl font-bold text-rose-600 mt-2">
                    Rs.{totalFines.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-rose-50 group-hover:bg-rose-100 transition-colors">
                  <DollarSign className="h-6 w-6 text-rose-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Approved fines amount
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Report Card */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5"></div>
          <CardHeader className="relative border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  <FileSpreadsheet className="inline mr-2 h-6 w-6 text-emerald-600" />
                  Generate Reports
                </CardTitle>
                <CardDescription>
                  Select report type, date range, and filters to generate
                  detailed reports
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchAllData}
                  className="border-gray-300 hover:border-emerald-400 hover:bg-emerald-50"
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  {isLoading ? "Refreshing..." : "Refresh Data"}
                </Button>
                <Button
                  onClick={exportToExcel}
                  disabled={exporting}
                  className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export to Excel
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative pt-6">
            {/* Report Type Tabs */}
            <Tabs
              value={reportType}
              onValueChange={setReportType}
              className="w-full"
            >
              <TabsList className="bg-gray-100 p-1 mb-6">
                <TabsTrigger
                  value="attendance"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Attendance Report
                </TabsTrigger>
                <TabsTrigger
                  value="leave"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Leave Report
                </TabsTrigger>
                <TabsTrigger
                  value="fines"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Fines Report
                </TabsTrigger>
              </TabsList>

              {/* Filters Card */}
              <Card className="border border-gray-200 mb-6">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Report Filters
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Start Date
                      </Label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={dateRange.start}
                          onChange={(e) =>
                            setDateRange({
                              ...dateRange,
                              start: e.target.value,
                            })
                          }
                          className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11 pl-10"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        End Date
                      </Label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={dateRange.end}
                          onChange={(e) =>
                            setDateRange({ ...dateRange, end: e.target.value })
                          }
                          className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11 pl-10"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Department
                      </Label>
                      <Select
                        value={departmentFilter}
                        onValueChange={setDepartmentFilter}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11">
                          <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="all"
                            className="hover:bg-emerald-50"
                          >
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
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Employee Name
                      </Label>
                      <Input
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        placeholder="Search by name or employee ID"
                        className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                      />
                    </div>
                    {reportType === "attendance" && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Filter className="h-3 w-3" />
                          Status
                        </Label>
                        <Select
                          value={attendanceStatusFilter}
                          onValueChange={setAttendanceStatusFilter}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value="all"
                              className="hover:bg-emerald-50"
                            >
                              All Statuses
                            </SelectItem>
                            <SelectItem
                              value="on_time"
                              className="hover:bg-emerald-50"
                            >
                              On Time
                            </SelectItem>
                            <SelectItem
                              value="late"
                              className="hover:bg-emerald-50"
                            >
                              Late
                            </SelectItem>
                            <SelectItem
                              value="absent"
                              className="hover:bg-emerald-50"
                            >
                              Absent
                            </SelectItem>
                            <SelectItem
                              value="half_day"
                              className="hover:bg-emerald-50"
                            >
                              Half Day
                            </SelectItem>
                            <SelectItem
                              value="leave"
                              className="hover:bg-emerald-50"
                            >
                              Leave
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {reportType === "leave" && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Filter className="h-3 w-3" />
                          Status
                        </Label>
                        <Select
                          value={leaveStatusFilter}
                          onValueChange={setLeaveStatusFilter}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value="all"
                              className="hover:bg-emerald-50"
                            >
                              All Statuses
                            </SelectItem>
                            <SelectItem
                              value="pending"
                              className="hover:bg-emerald-50"
                            >
                              Pending
                            </SelectItem>
                            <SelectItem
                              value="manager_approved"
                              className="hover:bg-emerald-50"
                            >
                              Manager Approved
                            </SelectItem>
                            <SelectItem
                              value="approved"
                              className="hover:bg-emerald-50"
                            >
                              Approved
                            </SelectItem>
                            <SelectItem
                              value="rejected"
                              className="hover:bg-emerald-50"
                            >
                              Rejected
                            </SelectItem>
                            <SelectItem
                              value="cancelled"
                              className="hover:bg-emerald-50"
                            >
                              Cancelled
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Summary
                      </Label>
                      <div className="h-11 flex items-center px-4 border border-gray-200 rounded-lg bg-gray-50 mt-2">
                        <p className="text-sm text-gray-600">
                          {reportType === "attendance" &&
                            `${filteredAttendance.length} records`}
                          {reportType === "leave" &&
                            `${filteredLeaves.length} leaves`}
                          {reportType === "fines" &&
                            `${filteredFines.length} fines`}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fines-specific Month/Year Filter */}
              {reportType === "fines" && (
                <Card className="border border-gray-200 mb-6">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Monthly Fine Report
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Month
                          </Label>
                          <Select
                            value={finesMonth.toString()}
                            onValueChange={(value) =>
                              setFinesMonth(parseInt(value))
                            }
                          >
                            <SelectTrigger className="w-40 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="1"
                                className="hover:bg-emerald-50"
                              >
                                January
                              </SelectItem>
                              <SelectItem
                                value="2"
                                className="hover:bg-emerald-50"
                              >
                                February
                              </SelectItem>
                              <SelectItem
                                value="3"
                                className="hover:bg-emerald-50"
                              >
                                March
                              </SelectItem>
                              <SelectItem
                                value="4"
                                className="hover:bg-emerald-50"
                              >
                                April
                              </SelectItem>
                              <SelectItem
                                value="5"
                                className="hover:bg-emerald-50"
                              >
                                May
                              </SelectItem>
                              <SelectItem
                                value="6"
                                className="hover:bg-emerald-50"
                              >
                                June
                              </SelectItem>
                              <SelectItem
                                value="7"
                                className="hover:bg-emerald-50"
                              >
                                July
                              </SelectItem>
                              <SelectItem
                                value="8"
                                className="hover:bg-emerald-50"
                              >
                                August
                              </SelectItem>
                              <SelectItem
                                value="9"
                                className="hover:bg-emerald-50"
                              >
                                September
                              </SelectItem>
                              <SelectItem
                                value="10"
                                className="hover:bg-emerald-50"
                              >
                                October
                              </SelectItem>
                              <SelectItem
                                value="11"
                                className="hover:bg-emerald-50"
                              >
                                November
                              </SelectItem>
                              <SelectItem
                                value="12"
                                className="hover:bg-emerald-50"
                              >
                                December
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Year
                          </Label>
                          <Select
                            value={finesYear.toString()}
                            onValueChange={(value) =>
                              setFinesYear(parseInt(value))
                            }
                          >
                            <SelectTrigger className="w-32 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...Array(5)].map((_, i) => {
                                const year = new Date().getFullYear() - 2 + i;
                                return (
                                  <SelectItem
                                    key={year}
                                    value={year.toString()}
                                    className="hover:bg-emerald-50"
                                  >
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFinesMonth(new Date().getMonth() + 1);
                          setFinesYear(new Date().getFullYear());
                        }}
                        className="border-gray-300 hover:border-emerald-400 hover:bg-emerald-50"
                      >
                        Reset to Current Month
                      </Button>
                      <div className="ml-auto">
                        <div className="text-sm font-medium text-gray-900">
                          {format(finesDateFrom, "MMMM yyyy")}
                        </div>
                        <div className="text-xs text-gray-500">
                          Showing {filteredFines.length} fines
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Report Content */}
              <div className="mt-6">
                <TabsContent value="attendance" className="mt-0">
                  <Card className="border border-gray-200">
                    <CardHeader className="border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-900">
                            Attendance Report
                          </CardTitle>
                          <CardDescription>
                            Daily attendance records for selected period
                          </CardDescription>
                        </div>
                        <div className="text-sm text-gray-600">
                          Showing {filteredAttendance.length} records
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <AttendanceReportTable
                        attendance={filteredAttendance}
                        employees={filteredEmployees}
                        canManage={canManage}
                        onUpdate={fetchAttendance}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="leave" className="mt-0">
                  <Card className="border border-gray-200">
                    <CardHeader className="border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-900">
                            Leave Report
                          </CardTitle>
                          <CardDescription>
                            Leave requests and approvals for selected period
                          </CardDescription>
                        </div>
                        <div className="text-sm text-gray-600">
                          Showing {filteredLeaves.length} leave requests
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <LeaveReportTable
                        leaves={filteredLeaves}
                        employees={filteredEmployees}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="fines" className="mt-0">
                  <Card className="border border-gray-200">
                    <CardHeader className="border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-900">
                            Fines Report
                          </CardTitle>
                          <CardDescription>
                            Monthly fine details and deductible calculations
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-600">
                            {format(finesDateFrom, "MMMM yyyy")}
                          </div>
                          <div className="px-2 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-medium">
                            {filteredFines.length} fines
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <FineReportTable
                        fines={filteredFines}
                        employees={filteredEmployees}
                        month={finesMonth}
                        year={finesYear}
                        onDeductibleFinesChange={setDeductibleFinesData}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Export Info Card */}
        <Card className="border border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Export Information
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  Click "Export to Excel" to generate detailed reports. Fines
                  reports follow the "Late Penalty Voucher" format with monthly
                  calculations and waiver status tracking.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
