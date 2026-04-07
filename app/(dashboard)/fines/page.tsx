"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DollarSign,
  AlertCircle,
  Search,
  Plus,
  HandCoins,
  Clock,
  Calendar as CalendarIcon,
  Filter,
  TrendingUp,
  FileText,
  Users,
  User,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  ChevronDown,
  Download,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { AddFineDialog } from "@/components/fines/add-fine-dialog";
import { CompensationRequestDialog } from "@/components/fines/compensation-request-dialog";
import { CompensationApprovalDialog } from "@/components/fines/compensation-approval-dialog";

interface FineWithEmployee {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  type: string;
  lateMinutes: number;
  reason?: string | null;
  amount: number;
  status: string;
  waiverReason?: string | null;
  createdAt: string;
  // Compensation fields
  compensationRequested?: boolean;
  compensationReason?: string | null;
  compensationRequestedAt?: string | null;
  compensationStatus?: string | null;
  compensationApprovedBy?: string | null;
  compensationApprovedAt?: string | null;
  compensationRejectionReason?: string | null;
}

export default function FinesPage() {
  const { user, hasPermission } = useAuth();
  const [fines, setFines] = useState<FineWithEmployee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [compensationRequestFine, setCompensationRequestFine] =
    useState<FineWithEmployee | null>(null);
  const [compensationApprovalFine, setCompensationApprovalFine] =
    useState<FineWithEmployee | null>(null);
  const [activeTab, setActiveTab] = useState<"team" | "my">("team");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Date range filter - default to current month
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    startOfMonth(new Date()),
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    endOfMonth(new Date()),
  );

  const canManageFines =
    hasPermission("manage_fines") || hasPermission("manage_team_fines");
  const canViewAll = hasPermission("view_all_fines");
  const canViewTeam = hasPermission("view_team_fines");
  const isSuperAdmin = user?.role === "super_admin";
  const isManager = user?.role === "manager";
  const currentUserEmployeeId = user?.employeeId;

  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchFines();
    fetchDepartments();
    fetchEmployees();
  }, []);

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

  const fetchFines = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/fines");
      if (response.ok) {
        const data = await response.json();
        setFines(data);
      }
    } catch (error) {
      console.error("Failed to fetch fines:", error);
    } finally {
      setIsLoading(false);
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

  // Filter fines based on role and active tab
  let visibleFines = fines;

  if (canViewAll) {
    // Super admin and HR see all fines
    visibleFines = fines;
  } else if (canViewTeam) {
    // Manager can see team fines or their own fines based on active tab
    const managerDepartmentId = employees.find(
      (e: any) => e.userId === user?.id,
    )?.departmentId;
    if (managerDepartmentId) {
      const departmentEmployeeIds = employees
        .filter((e: any) => e.departmentId === managerDepartmentId)
        .map((e: any) => e.id);

      if (activeTab === "my") {
        // Show only manager's own fines
        visibleFines = fines.filter(
          (f) => f.employeeId === currentUserEmployeeId,
        );
      } else {
        // Show all department fines (including manager's own)
        visibleFines = fines.filter((f) =>
          departmentEmployeeIds.includes(f.employeeId),
        );
      }
    }
  } else {
    // Employee sees only their own fines
    visibleFines = fines.filter((f) => f.employeeId === user?.employeeId);
  }

  const filteredFines = visibleFines.filter((fine) => {
    const matchesSearch =
      fine.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      fine.employeeId?.toLowerCase().includes(search.toLowerCase());

    let matchesStatus = statusFilter === "all";
    if (statusFilter === "pending_review") {
      matchesStatus =
        fine.compensationRequested === true &&
        fine.compensationStatus === "pending";
    } else if (statusFilter === "waived") {
      matchesStatus =
        fine.status === "waived" || fine.compensationStatus === "approved";
    } else if (statusFilter !== "all") {
      matchesStatus = fine.status === statusFilter;
    }

    const matchesDepartment =
      departmentFilter === "all" || fine.department === departmentFilter;

    // Date range filter
    let matchesDateRange = true;
    if (dateFrom || dateTo) {
      const fineDate = parseISO(fine.date);
      if (dateFrom && dateTo) {
        matchesDateRange = isWithinInterval(fineDate, {
          start: dateFrom,
          end: dateTo,
        });
      } else if (dateFrom) {
        matchesDateRange = fineDate >= dateFrom;
      } else if (dateTo) {
        matchesDateRange = fineDate <= dateTo;
      }
    }

    return (
      matchesSearch && matchesStatus && matchesDepartment && matchesDateRange
    );
  });

  // Calculate stats based on filtered fines (includes date range)
  const stats = {
    total: filteredFines.length,
    implemented: filteredFines.filter(
      (f) => f.status === "implemented" && f.compensationStatus !== "approved",
    ).length,
    waived: filteredFines.filter(
      (f) => f.status === "waived" || f.compensationStatus === "approved",
    ).length,
    pendingReview: filteredFines.filter(
      (f) => f.compensationRequested && f.compensationStatus === "pending",
    ).length,
    totalAmount: filteredFines
      .filter(
        (f) =>
          f.status === "implemented" && f.compensationStatus !== "approved",
      )
      .reduce((sum, f) => sum + f.amount, 0),
  };

  // Handle sorting
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

  const sortedFines = [...filteredFines].sort((a, b) => {
    if (!sortConfig) return 0;

    switch (sortConfig.key) {
      case "employee":
        return sortConfig.direction === "asc"
          ? (a.employeeName || "").localeCompare(b.employeeName || "")
          : (b.employeeName || "").localeCompare(a.employeeName || "");
      case "date":
        return sortConfig.direction === "asc"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      case "amount":
        return sortConfig.direction === "asc"
          ? a.amount - b.amount
          : b.amount - a.amount;
      case "status":
        return sortConfig.direction === "asc"
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      default:
        return 0;
    }
  });

  const getStatusBadge = (fine: FineWithEmployee) => {
    // Check compensation status first
    if (fine.compensationRequested && fine.compensationStatus === "pending") {
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
          Pending Review
        </Badge>
      );
    }
    if (fine.compensationStatus === "approved" || fine.status === "waived") {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
          Waived
        </Badge>
      );
    }
    if (fine.compensationStatus === "rejected") {
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200">
          Rejected
        </Badge>
      );
    }

    switch (fine.status) {
      case "implemented":
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200">
            Implemented
          </Badge>
        );
      case "waived":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
            Waived
          </Badge>
        );
      default:
        return <Badge variant="outline">{fine.status}</Badge>;
    }
  };

  const getFineTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      late_arrival: "bg-blue-100 text-blue-800 border-blue-200",
      policy_violation: "bg-red-100 text-red-800 border-red-200",
      misconduct: "bg-purple-100 text-purple-800 border-purple-200",
      other: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      <Badge variant="outline" className={`capitalize ${colors[type] || ""}`}>
        {type === "late_arrival" ? "Late Arrival" : type.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Fine Management"
        description="Review and manage employee fines"
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fines</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All fines recorded
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Implemented</CardTitle>
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">
                {stats.implemented}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active fines</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waived</CardTitle>
              <HandCoins className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {stats.waived}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Forgiven fines
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Amount
              </CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                Rs.{stats.totalAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isSuperAdmin && stats.pendingReview > 0 && (
                  <span className="text-amber-600 font-medium">
                    {stats.pendingReview} pending review
                  </span>
                )}
                {(!isSuperAdmin || stats.pendingReview === 0) &&
                  "Implemented fines only"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Manager Tabs or Regular View */}
        {isManager ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "team" | "my")}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <TabsList className="bg-gray-100 p-1">
                    <TabsTrigger
                      value="team"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Team Fines
                    </TabsTrigger>
                    <TabsTrigger
                      value="my"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                    >
                      <User className="mr-2 h-4 w-4" />
                      My Fines
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex flex-wrap gap-2">
                    {canManageFines && activeTab === "team" && (
                      <Button
                        onClick={() => setIsAddDialogOpen(true)}
                        className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Fine
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>

                <TabsContent
                  value={activeTab}
                  className="space-y-6 animate-in fade-in"
                >
                  {/* Filters Card */}
                  <Card className="border border-gray-200 bg-white">
                    <CardContent className="pt-6">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">
                                Search
                              </p>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Search employees..."
                                  value={search}
                                  onChange={(e) => setSearch(e.target.value)}
                                  className="pl-10 w-[240px] border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                                />
                              </div>
                            </div>

                            {/* Date Range Filter */}
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">
                                Date Range
                              </p>
                              <div className="flex gap-2 items-center">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-[140px] border-gray-300 hover:border-[#00b576]"
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {dateFrom
                                        ? format(dateFrom, "MMM d")
                                        : "From"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                  >
                                    <Calendar
                                      selected={dateFrom}
                                      onSelect={(date) =>
                                        date && setDateFrom(date)
                                      }
                                    />
                                  </PopoverContent>
                                </Popover>
                                <span className="text-gray-500">to</span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-[140px] border-gray-300 hover:border-[#00b576]"
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {dateTo ? format(dateTo, "MMM d") : "To"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                  >
                                    <Calendar
                                      selected={dateTo}
                                      onSelect={(date) =>
                                        date && setDateTo(date)
                                      }
                                    />
                                  </PopoverContent>
                                </Popover>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDateFrom(startOfMonth(new Date()));
                                    setDateTo(endOfMonth(new Date()));
                                  }}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  Reset
                                </Button>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">
                                Status
                              </p>
                              <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                              >
                                <SelectTrigger className="w-[180px] border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                                  <div className="flex items-center gap-2">
                                    <Filter className="h-3 w-3" />
                                    <SelectValue placeholder="Filter by status" />
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem
                                    value="all"
                                    className="hover:bg-emerald-50"
                                  >
                                    All Status
                                  </SelectItem>
                                  <SelectItem
                                    value="implemented"
                                    className="hover:bg-emerald-50"
                                  >
                                    Implemented
                                  </SelectItem>
                                  <SelectItem
                                    value="waived"
                                    className="hover:bg-emerald-50"
                                  >
                                    Waived
                                  </SelectItem>
                                  <SelectItem
                                    value="pending_review"
                                    className="hover:bg-emerald-50"
                                  >
                                    Pending Review
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {activeTab === "team" && (
                              <div>
                                <p className="text-sm font-medium text-gray-600 mb-2">
                                  Department
                                </p>
                                <Select
                                  value={departmentFilter}
                                  onValueChange={setDepartmentFilter}
                                >
                                  <SelectTrigger className="w-[180px] border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-3 w-3" />
                                      <SelectValue placeholder="All Departments" />
                                    </div>
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
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fines Table */}
                  <Card className="border border-gray-200 bg-white overflow-hidden">
                    <CardHeader className="border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-[#1a2937]">
                          {activeTab === "team" ? "Team Fines" : "My Fines"} (
                          {sortedFines.length})
                        </CardTitle>
                        <div className="text-sm text-gray-500">
                          Showing {sortedFines.length} of {visibleFines.length}{" "}
                          fines
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="font-semibold">
                                <button
                                  onClick={() => handleSort("employee")}
                                  className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                                >
                                  Employee
                                  <ArrowUpDown className="h-3 w-3" />
                                </button>
                              </TableHead>
                              <TableHead className="font-semibold">
                                <button
                                  onClick={() => handleSort("date")}
                                  className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                                >
                                  Date
                                  <ArrowUpDown className="h-3 w-3" />
                                </button>
                              </TableHead>
                              <TableHead className="font-semibold">
                                Type
                              </TableHead>
                              <TableHead className="font-semibold">
                                Reason
                              </TableHead>
                              <TableHead className="font-semibold">
                                <button
                                  onClick={() => handleSort("amount")}
                                  className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                                >
                                  Amount
                                  <ArrowUpDown className="h-3 w-3" />
                                </button>
                              </TableHead>
                              <TableHead className="font-semibold">
                                <button
                                  onClick={() => handleSort("status")}
                                  className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                                >
                                  Status
                                  <ArrowUpDown className="h-3 w-3" />
                                </button>
                              </TableHead>
                              <TableHead className="font-semibold">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className="text-center py-12"
                                >
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="h-8 w-8 text-[#00b576] animate-spin" />
                                    <p className="text-gray-500">
                                      Loading fines data...
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : sortedFines.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className="text-center py-12"
                                >
                                  <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="p-3 rounded-full bg-gray-100">
                                      <FileText className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 font-medium">
                                      No fines found
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      Try adjusting your filters
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              sortedFines.map((fine: FineWithEmployee) => (
                                <TableRow
                                  key={fine.id}
                                  className="group hover:bg-emerald-50/50 transition-colors duration-200"
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-emerald-700">
                                          {fine.employeeName?.charAt(0) || "U"}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="font-medium text-[#1a2937] group-hover:text-emerald-700 transition-colors">
                                          {fine.employeeName || "Unknown"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {fine.department || "-"}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <CalendarIcon className="h-3 w-3 text-gray-400" />
                                      <span className="text-sm">
                                        {format(
                                          new Date(fine.date),
                                          "MMM d, yyyy",
                                        )}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {getFineTypeBadge(fine.type)}
                                  </TableCell>
                                  <TableCell className="max-w-[200px]">
                                    <div className="space-y-1">
                                      <p className="text-sm text-gray-600">
                                        {fine.type === "late_arrival"
                                          ? `${fine.lateMinutes} min late`
                                          : fine.reason || "-"}
                                      </p>
                                      {fine.waiverReason && (
                                        <p className="text-xs text-emerald-600 italic">
                                          <CheckCircle2 className="inline h-3 w-3 mr-1" />
                                          {fine.waiverReason}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-3 w-3 text-red-500" />
                                      <span className="font-medium text-red-600">
                                        Rs.{fine.amount}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{getStatusBadge(fine)}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-2 flex-wrap">
                                      {/* User's own fine: Request Compensation button */}
                                      {!isSuperAdmin &&
                                        fine.employeeId ===
                                          currentUserEmployeeId &&
                                        fine.status === "implemented" &&
                                        !fine.compensationRequested && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              setCompensationRequestFine(fine)
                                            }
                                            className="h-8 px-3 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                          >
                                            <HandCoins className="mr-1 h-3 w-3" />
                                            Request Waiver
                                          </Button>
                                        )}

                                      {/* User's own fine: Show pending status */}
                                      {!isSuperAdmin &&
                                        fine.employeeId ===
                                          currentUserEmployeeId &&
                                        fine.compensationRequested &&
                                        fine.compensationStatus ===
                                          "pending" && (
                                          <Badge
                                            variant="outline"
                                            className="bg-amber-50 text-amber-700 border-amber-200"
                                          >
                                            <Clock className="mr-1 h-3 w-3" />
                                            Pending Review
                                          </Badge>
                                        )}

                                      {/* Super Admin: Review compensation request */}
                                      {isSuperAdmin &&
                                        fine.compensationRequested &&
                                        fine.compensationStatus ===
                                          "pending" && (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() =>
                                              setCompensationApprovalFine(fine)
                                            }
                                            className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                          >
                                            Review Request
                                          </Button>
                                        )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          // Non-manager view
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 space-y-6">
              {/* Header and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#1a2937]">
                    {canViewAll ? "All Fines" : "My Fines"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Track and manage {canViewAll ? "all employee" : "your"}{" "}
                    fines
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canManageFines && (
                    <Button
                      onClick={() => setIsAddDialogOpen(true)}
                      className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Fine
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Filters Card */}
              <Card className="border border-gray-200 bg-white">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <p className="text-sm font-medium text-gray-600 mb-2">
                            Search
                          </p>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search employees..."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className="pl-10 w-full border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                            />
                          </div>
                        </div>

                        {/* Date Range Filter */}
                        <div className="min-w-[340px]">
                          <p className="text-sm font-medium text-gray-600 mb-2">
                            Date Range
                          </p>
                          <div className="flex gap-2 items-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-[140px] border-gray-300 hover:border-[#00b576]"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateFrom
                                    ? format(dateFrom, "MMM d")
                                    : "From"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  selected={dateFrom}
                                  onSelect={(date) => date && setDateFrom(date)}
                                />
                              </PopoverContent>
                            </Popover>
                            <span className="text-gray-500">to</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-[140px] border-gray-300 hover:border-[#00b576]"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateTo ? format(dateTo, "MMM d") : "To"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  selected={dateTo}
                                  onSelect={(date) => date && setDateTo(date)}
                                />
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDateFrom(startOfMonth(new Date()));
                                setDateTo(endOfMonth(new Date()));
                              }}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              Reset
                            </Button>
                          </div>
                        </div>

                        <div className="min-w-[180px]">
                          <p className="text-sm font-medium text-gray-600 mb-2">
                            Status
                          </p>
                          <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                          >
                            <SelectTrigger className="w-full border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                              <div className="flex items-center gap-2">
                                <Filter className="h-3 w-3" />
                                <SelectValue placeholder="Filter by status" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="all"
                                className="hover:bg-emerald-50"
                              >
                                All Status
                              </SelectItem>
                              <SelectItem
                                value="implemented"
                                className="hover:bg-emerald-50"
                              >
                                Implemented
                              </SelectItem>
                              <SelectItem
                                value="waived"
                                className="hover:bg-emerald-50"
                              >
                                Waived
                              </SelectItem>
                              <SelectItem
                                value="pending_review"
                                className="hover:bg-emerald-50"
                              >
                                Pending Review
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {canViewAll && (
                          <div className="min-w-[180px]">
                            <p className="text-sm font-medium text-gray-600 mb-2">
                              Department
                            </p>
                            <Select
                              value={departmentFilter}
                              onValueChange={setDepartmentFilter}
                            >
                              <SelectTrigger className="w-full border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3" />
                                  <SelectValue placeholder="All Departments" />
                                </div>
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
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fines Table */}
              <Card className="border border-gray-200 bg-white overflow-hidden">
                <CardHeader className="border-b bg-linear-to-t to-white from-gray-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-[#1a2937]">
                      {canViewAll ? "All Fines" : "My Fines"} (
                      {sortedFines.length})
                    </CardTitle>
                    <div className="text-sm text-gray-500">
                      Showing {sortedFines.length} of {visibleFines.length}{" "}
                      fines
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-linear-to-t from-gray-50 to-white">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold">
                            <button
                              onClick={() => handleSort("employee")}
                              className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                            >
                              Employee
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </TableHead>
                          <TableHead className="font-semibold">
                            <button
                              onClick={() => handleSort("date")}
                              className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                            >
                              Date
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </TableHead>
                          <TableHead className="font-semibold">Type</TableHead>
                          <TableHead className="font-semibold">
                            Reason
                          </TableHead>
                          <TableHead className="font-semibold">
                            <button
                              onClick={() => handleSort("amount")}
                              className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                            >
                              Amount
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </TableHead>
                          <TableHead className="font-semibold">
                            <button
                              onClick={() => handleSort("status")}
                              className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                            >
                              Status
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </TableHead>
                          <TableHead className="font-semibold">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-12"
                            >
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Loader2 className="h-8 w-8 text-[#00b576] animate-spin" />
                                <p className="text-gray-500">
                                  Loading fines data...
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : sortedFines.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-12"
                            >
                              <div className="flex flex-col items-center justify-center gap-3">
                                <div className="p-3 rounded-full bg-gray-100">
                                  <FileText className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-gray-600 font-medium">
                                  No fines found
                                </p>
                                <p className="text-sm text-gray-500">
                                  Try adjusting your filters
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedFines.map((fine: FineWithEmployee) => (
                            <TableRow
                              key={fine.id}
                              className="group hover:bg-emerald-50/50 transition-colors duration-200"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-emerald-700">
                                      {fine.employeeName?.charAt(0) || "U"}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-[#1a2937] group-hover:text-emerald-700 transition-colors">
                                      {fine.employeeName || "Unknown"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {fine.department || "-"}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm">
                                    {format(new Date(fine.date), "MMM d, yyyy")}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getFineTypeBadge(fine.type)}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-600">
                                    {fine.type === "late_arrival"
                                      ? `${fine.lateMinutes} min late`
                                      : fine.reason || "-"}
                                  </p>
                                  {fine.waiverReason && (
                                    <p className="text-xs text-emerald-600 italic">
                                      <CheckCircle2 className="inline h-3 w-3 mr-1" />
                                      {fine.waiverReason}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-3 w-3 text-red-500" />
                                  <span className="font-medium text-red-600">
                                    Rs.{fine.amount}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(fine)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2 flex-wrap">
                                  {/* User's own fine: Request Compensation button */}
                                  {!isSuperAdmin &&
                                    fine.employeeId === currentUserEmployeeId &&
                                    fine.status === "implemented" &&
                                    !fine.compensationRequested && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          setCompensationRequestFine(fine)
                                        }
                                        className="h-8 px-3 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                      >
                                        <HandCoins className="mr-1 h-3 w-3" />
                                        Request Waiver
                                      </Button>
                                    )}

                                  {/* User's own fine: Show pending status */}
                                  {!isSuperAdmin &&
                                    fine.employeeId === currentUserEmployeeId &&
                                    fine.compensationRequested &&
                                    fine.compensationStatus === "pending" && (
                                      <Badge
                                        variant="outline"
                                        className="bg-amber-50 text-amber-700 border-amber-200"
                                      >
                                        <Clock className="mr-1 h-3 w-3" />
                                        Pending Review
                                      </Badge>
                                    )}

                                  {/* Super Admin: Review compensation request */}
                                  {isSuperAdmin &&
                                    fine.compensationRequested &&
                                    fine.compensationStatus === "pending" && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() =>
                                          setCompensationApprovalFine(fine)
                                        }
                                        className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                      >
                                        Review Request
                                      </Button>
                                    )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <AddFineDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchFines}
      />

      <CompensationRequestDialog
        fine={compensationRequestFine}
        open={!!compensationRequestFine}
        onOpenChange={(open) => !open && setCompensationRequestFine(null)}
        onSuccess={fetchFines}
      />

      <CompensationApprovalDialog
        fine={compensationApprovalFine}
        open={!!compensationApprovalFine}
        onOpenChange={(open) => !open && setCompensationApprovalFine(null)}
        onSuccess={fetchFines}
      />
    </div>
  );
}
