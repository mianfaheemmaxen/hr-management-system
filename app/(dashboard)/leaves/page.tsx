"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  List, 
  Settings, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Users,
  User,
  BarChart3,
  CalendarDays,
  FileText,
  Filter,
  ArrowUpDown,
  Loader2,
  Eye,
  Edit,
  TrendingUp,
  Download
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ApplyLeaveDialog } from "@/components/leaves/apply-leave-dialog";
import { LeaveApprovalDialog } from "@/components/leaves/leave-approval-dialog";
import { EditLeaveDialog } from "@/components/leaves/edit-leave-dialog";
import { LeaveCalendar } from "@/components/leaves/leave-calendar";
import { AssignLeaveQuotaDialog } from "@/components/leaves/assign-leave-quota-dialog";
import { LeaveRequest } from "@/lib/types";
import { Input } from "@/components/ui/input";

export default function LeavesPage() {
  const { user, hasPermission } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [unpaidLeaveUsage, setUnpaidLeaveUsage] = useState<number>(0);
  const [allEmployeesBalances, setAllEmployeesBalances] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isAssignQuotaDialogOpen, setIsAssignQuotaDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [leaveToEdit, setLeaveToEdit] = useState<LeaveRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [leaveTimeFilter, setLeaveTimeFilter] = useState<"all" | "pre" | "post">("all");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const itemsPerPage = 10;

  const canApproveLeaves = hasPermission("approve_leaves_manager") || hasPermission("approve_leaves_final");
  const canViewAll = hasPermission("view_all_leaves");
  const canManageQuotas = hasPermission("manage_employees") || user?.role === "hr_manager" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    fetchLeaveRequests();
    if (canViewAll) {
      fetchAllEmployeesBalances();
    }
  }, []);

  useEffect(() => {
    if (user?.employeeId) {
      fetchLeaveBalances();
    }
  }, [user?.employeeId]);

  // Calculate unpaid leave usage whenever leave requests change
  useEffect(() => {
    if (user?.employeeId) {
      const currentYear = new Date().getFullYear();
      const unpaidDays = leaveRequests
        .filter((leave) =>
          leave.employeeId === user.employeeId &&
          leave.leaveType === 'unpaid' &&
          leave.status === 'approved' &&
          new Date(leave.startDate).getFullYear() === currentYear
        )
        .reduce((total, leave) => total + leave.totalDays, 0);
      setUnpaidLeaveUsage(unpaidDays);
    }
  }, [leaveRequests, user?.employeeId]);

  const fetchLeaveRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/leaves");
      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      if (!user?.employeeId) return;

      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/leave-balance?employeeId=${user.employeeId}&year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        setLeaveBalances(data);
      }
    } catch (error) {
      console.error("Failed to fetch leave balances:", error);
    }
  };

  const fetchAllEmployeesBalances = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/leave-balance?year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        setAllEmployeesBalances(data);
      }
    } catch (error) {
      console.error("Failed to fetch all employees balances:", error);
    }
  };

  // Filter leave requests by status and time (role-based filtering is done on API side)
  const filteredLeaves = leaveRequests.filter((leave) => {
    // Status filter
    let matchesStatus = true;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "pending") {
      matchesStatus = leave.status === "pending" || leave.status === "manager_approved";
    } else {
      matchesStatus = leave.status === statusFilter;
    }

    // Time filter (pre/post) - only for super admin
    let matchesTimeFilter = true;
    if (isSuperAdmin && leaveTimeFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      const leaveStartDate = new Date(leave.startDate);
      leaveStartDate.setHours(0, 0, 0, 0);

      if (leaveTimeFilter === "pre") {
        // Pre-leaves: start date is today or in the future
        matchesTimeFilter = leaveStartDate >= today;
      } else if (leaveTimeFilter === "post") {
        // Post-leaves: start date is in the past
        matchesTimeFilter = leaveStartDate < today;
      }
    }

    return matchesStatus && matchesTimeFilter;
  });

  // Get current user's leave balance
  const myLeaveBalances = leaveBalances.filter((lb) => lb.employeeId === user?.employeeId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200">Rejected</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Pending</Badge>;
      case "manager_approved":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">Manager Approved</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const leaveTypeLabels: Record<string, string> = {
    sick: "Sick Leave",
    annual: "Annual Leave",
    complementary: "Complementary Leave",
    unpaid: "Unpaid Leave",
    maternity: "Maternity Leave",
    umrah: "Umrah Leave",
    half_day: "Half Day Leave",
    short_leave: "Short Leave",
  };

  const getLeaveTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      sick: "bg-red-100 text-red-800 border-red-200",
      annual: "bg-emerald-100 text-emerald-800 border-emerald-200",
      complementary: "bg-blue-100 text-blue-800 border-blue-200",
      unpaid: "bg-gray-100 text-gray-800 border-gray-200",
      maternity: "bg-pink-100 text-pink-800 border-pink-200",
      umrah: "bg-purple-100 text-purple-800 border-purple-200",
      half_day: "bg-orange-100 text-orange-800 border-orange-200",
      short_leave: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return (
      <Badge variant="outline" className={`${colors[type] || ""}`}>
        {leaveTypeLabels[type] || type}
      </Badge>
    );
  };

  const pendingCount = leaveRequests.filter(
    (l) => l.status === "pending" || l.status === "manager_approved"
  ).length;

  // Calculate pre and post leave counts for super admin
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const preLeavesCount = isSuperAdmin ? leaveRequests.filter((l) => {
    const leaveStartDate = new Date(l.startDate);
    leaveStartDate.setHours(0, 0, 0, 0);
    return (l.status === "pending" || l.status === "manager_approved") && leaveStartDate >= today;
  }).length : 0;

  const postLeavesCount = isSuperAdmin ? leaveRequests.filter((l) => {
    const leaveStartDate = new Date(l.startDate);
    leaveStartDate.setHours(0, 0, 0, 0);
    return (l.status === "pending" || l.status === "manager_approved") && leaveStartDate < today;
  }).length : 0;

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedLeaves = [...filteredLeaves].sort((a, b) => {
    if (!sortConfig) return 0;
    
    switch (sortConfig.key) {
      case 'employee':
        return sortConfig.direction === 'asc'
          ? (a.employeeName || '').localeCompare(b.employeeName || '')
          : (b.employeeName || '').localeCompare(a.employeeName || '');
      case 'startDate':
        return sortConfig.direction === 'asc'
          ? new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          : new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      case 'days':
        const daysA = differenceInDays(new Date(a.endDate), new Date(a.startDate)) + 1;
        const daysB = differenceInDays(new Date(b.endDate), new Date(b.startDate)) + 1;
        return sortConfig.direction === 'asc' ? daysA - daysB : daysB - daysA;
      case 'status':
        return sortConfig.direction === 'asc'
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      default:
        return 0;
    }
  });

  // Group balances by employee
  const groupedBalances = allEmployeesBalances.reduce((acc: any, balance: any) => {
    if (!acc[balance.employeeId]) {
      acc[balance.employeeId] = {
        employeeId: balance.employeeId,
        employeeName: balance.employeeName,
        department: balance.department,
        balances: [],
      };
    }
    acc[balance.employeeId].balances.push(balance);
    return acc;
  }, {});

  // Convert to array and filter by search query
  const employeeBalancesList = Object.values(groupedBalances).filter((employee: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      employee.employeeName.toLowerCase().includes(query) ||
      employee.department.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil(employeeBalancesList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = employeeBalancesList.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Stats for cards
  const myTotalLeaves = myLeaveBalances.filter(b => b.leaveType !== 'unpaid').reduce((acc, curr) => acc + curr.remainingDays, 0);
  const myUsedLeaves = myLeaveBalances.filter(b => b.leaveType !== 'unpaid').reduce((acc, curr) => acc + curr.usedDays, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Leave Management"
        description="Apply for leave and manage leave requests"
      />

      <div className="p-6 space-y-6">
        {/* My Leave Balance Card */}
        <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 animate-in fade-in">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-[#1a2937]">
                  My Leave Balance
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Available leave days for {new Date().getFullYear()}
                </CardDescription>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50">
                <CalendarDays className="h-5 w-5 text-[#00b576]" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {myLeaveBalances.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">
                  No leave balances assigned yet.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Contact HR to assign your leave quota.
                </p>
              </div>
            ) : (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-25 border border-emerald-100">
                    <p className="text-sm font-medium text-gray-600">Total Available</p>
                    <p className="text-2xl font-bold text-emerald-600">{myTotalLeaves}</p>
                    <p className="text-xs text-gray-500">Days remaining</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-25 border border-blue-100">
                    <p className="text-sm font-medium text-gray-600">Used This Year</p>
                    <p className="text-2xl font-bold text-blue-600">{myUsedLeaves}</p>
                    <p className="text-xs text-gray-500">Days utilized</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-25 border border-amber-100">
                    <p className="text-sm font-medium text-gray-600">Unpaid Used</p>
                    <p className="text-2xl font-bold text-amber-600">{unpaidLeaveUsage}</p>
                    <p className="text-xs text-gray-500">Days this year</p>
                  </div>
                </div>

                {/* Detailed Balances */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {/* Filter out unpaid from database balances - we show it separately */}
                  {myLeaveBalances.filter(b => b.leaveType !== 'unpaid').map((balance) => {
                    const percentage = (balance.usedDays / balance.totalDays) * 100;
                    return (
                      <div 
                        key={balance.id} 
                        className="group p-4 border border-gray-200 rounded-lg bg-white hover:border-[#00b576] hover:shadow-sm transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium capitalize text-gray-700">
                            {balance.leaveType}
                          </p>
                          <Badge 
                            variant="outline" 
                            className="bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            {balance.remainingDays} left
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium text-[#1a2937]">
                              {balance.usedDays}/{balance.totalDays}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#00b576] to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Unpaid Leave - Always show as unlimited */}
                  <div className="group p-4 border border-gray-200 rounded-lg bg-white hover:border-[#00b576] hover:shadow-sm transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium capitalize text-gray-700">Unpaid</p>
                      <Badge 
                        variant="outline" 
                        className="bg-gray-50 text-gray-700 border-gray-200"
                      >
                        Unlimited
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Used This Year</span>
                        <span className="font-medium text-[#1a2937]">
                          {unpaidLeaveUsage} days
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-gray-400 to-gray-300 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min((unpaidLeaveUsage / 30) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="requests" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <TabsList className="bg-gray-100 p-1">
              <TabsTrigger 
                value="requests" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
              >
                <List className="mr-2 h-4 w-4" />
                Leave Requests
                {pendingCount > 0 && (
                  <Badge className="ml-2 bg-rose-500 text-white">
                    {isSuperAdmin ? (
                      <span title={`Pre: ${preLeavesCount}, Post: ${postLeavesCount}`}>
                        {pendingCount} ({preLeavesCount}↑ / {postLeavesCount}↓)
                      </span>
                    ) : (
                      pendingCount
                    )}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Calendar View
              </TabsTrigger>
              {canViewAll && (
                <TabsTrigger 
                  value="balances" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <Users className="mr-2 h-4 w-4" />
                  All Balances
                </TabsTrigger>
              )}
            </TabsList>
            
            <div className="flex flex-wrap gap-2">
              {canManageQuotas && (
                <Button 
                  variant="outline"
                  onClick={() => setIsAssignQuotaDialogOpen(true)}
                  className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50 text-gray-700"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Assign Quota
                </Button>
              )}
              <Button 
                onClick={() => setIsApplyDialogOpen(true)}
                className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Apply for Leave
              </Button>
            </div>
          </div>

          {/* Leave Requests Tab */}
          <TabsContent value="requests" className="space-y-6 animate-in fade-in">
            {/* Filters Card */}
            <Card className="border border-gray-200 bg-white">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Super Admin: Pre/Post Leave Tabs */}
                  {isSuperAdmin ? (
                    <div className="flex-1">
                      <Tabs 
                        value={leaveTimeFilter} 
                        onValueChange={(v) => setLeaveTimeFilter(v as "all" | "pre" | "post")}
                        className="w-full"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <TabsList className="bg-gray-100 p-1">
                            <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
                              All Leaves
                            </TabsTrigger>
                            <TabsTrigger value="pre" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">
                              Pre-Leaves
                            </TabsTrigger>
                            <TabsTrigger value="post" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white">
                              Post-Leaves
                            </TabsTrigger>
                          </TabsList>
                          
                          {/* Status Filter */}
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                              <div className="flex items-center gap-2">
                                <Filter className="h-3 w-3" />
                                <SelectValue placeholder="Filter by status" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all" className="hover:bg-emerald-50">All Status</SelectItem>
                              <SelectItem value="pending" className="hover:bg-emerald-50">Pending</SelectItem>
                              <SelectItem value="approved" className="hover:bg-emerald-50">Approved</SelectItem>
                              <SelectItem value="rejected" className="hover:bg-emerald-50">Rejected</SelectItem>
                              <SelectItem value="cancelled" className="hover:bg-emerald-50">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </Tabs>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                          <div className="flex items-center gap-2">
                            <Filter className="h-3 w-3" />
                            <SelectValue placeholder="Filter by status" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="hover:bg-emerald-50">All Status</SelectItem>
                          <SelectItem value="pending" className="hover:bg-emerald-50">Pending</SelectItem>
                          <SelectItem value="approved" className="hover:bg-emerald-50">Approved</SelectItem>
                          <SelectItem value="rejected" className="hover:bg-emerald-50">Rejected</SelectItem>
                          <SelectItem value="cancelled" className="hover:bg-emerald-50">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Leave Requests Table */}
            <Card className="border border-gray-200 bg-white overflow-hidden">
              <CardHeader className="border-b bg-gray-50">
                <CardTitle className="text-lg font-bold text-[#1a2937]">
                  Leave Requests ({sortedLeaves.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold">
                          <button 
                            onClick={() => handleSort('employee')}
                            className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                          >
                            Employee
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </TableHead>
                        <TableHead className="font-semibold">Leave Type</TableHead>
                        <TableHead className="font-semibold">
                          <button 
                            onClick={() => handleSort('startDate')}
                            className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                          >
                            Duration
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <button 
                            onClick={() => handleSort('days')}
                            className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                          >
                            Days
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </TableHead>
                        <TableHead className="font-semibold">Reason</TableHead>
                        <TableHead className="font-semibold">
                          <button 
                            onClick={() => handleSort('status')}
                            className="flex items-center gap-1 hover:text-[#00b576] transition-colors"
                          >
                            Status
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="h-8 w-8 text-[#00b576] animate-spin" />
                              <p className="text-gray-500">Loading leave requests...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : sortedLeaves.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="p-3 rounded-full bg-gray-100">
                                <Calendar className="h-6 w-6 text-gray-400" />
                              </div>
                              <p className="text-gray-600 font-medium">No leave requests found</p>
                              <p className="text-sm text-gray-500">Try adjusting your filters</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedLeaves.map((leave: any) => {
                          const days = differenceInDays(new Date(leave.endDate), new Date(leave.startDate)) + 1;
                          const canApprove =
                            canApproveLeaves &&
                            (leave.status === "pending" || leave.status === "manager_approved");

                          return (
                            <TableRow 
                              key={leave.id} 
                              className="group hover:bg-emerald-50/50 transition-colors duration-200"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-emerald-700">
                                      {leave.employeeName?.charAt(0) || "U"}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-[#1a2937] group-hover:text-emerald-700 transition-colors">
                                      {leave.employeeName || "Unknown"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {leave.department || "-"}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{getLeaveTypeBadge(leave.leaveType)}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3 text-gray-400" />
                                    <span className="font-medium">
                                      {format(new Date(leave.startDate), "MMM d")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 ml-5 mt-1">
                                    <span className="text-xs text-gray-500">to</span>
                                    <span className="text-xs text-gray-600">
                                      {format(new Date(leave.endDate), "MMM d, yyyy")}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span className="font-medium text-[#1a2937]">{days}</span>
                                  <span className="text-xs text-gray-500">days</span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {leave.reason || "No reason provided"}
                                </p>
                              </TableCell>
                              <TableCell>{getStatusBadge(leave.status)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedLeave(leave)}
                                    className="h-8 px-3 text-xs hover:bg-emerald-50 hover:text-emerald-700"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  {canApprove && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedLeave(leave)}
                                      className="h-8 px-3 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Review
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar View Tab */}
          <TabsContent value="calendar" className="space-y-4 animate-in fade-in">
            <LeaveCalendar
              leaves={filteredLeaves.map(leave => ({
                ...leave,
                employeeName: leave.employeeName || "Unknown",
                department: leave.department || "-"
              }))}
              onLeaveClick={(leave) => {
                // Find the full LeaveRequest object from filteredLeaves
                const fullLeave = filteredLeaves.find(l => l.id === leave.id);
                if (fullLeave) {
                  setSelectedLeave(fullLeave);
                }
              }}
            />
          </TabsContent>

          {/* All Balances Tab */}
          {canViewAll && (
            <TabsContent value="balances" className="space-y-4 animate-in fade-in">
              <Card className="border border-gray-200 bg-white">
                <CardHeader className="border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-[#1a2937]">
                        All Employees Leave Balances
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {new Date().getFullYear()} - {employeeBalancesList.length} employee{employeeBalancesList.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search employees..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-[240px] border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {allEmployeesBalances.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="p-3 rounded-full bg-gray-100 inline-flex mb-3">
                        <Users className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">No leave balances found</p>
                      <p className="text-sm text-gray-500 mt-1">Start by assigning leave quotas to employees</p>
                    </div>
                  ) : employeeBalancesList.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="p-3 rounded-full bg-gray-100 inline-flex mb-3">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">No employees found</p>
                      <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {paginatedEmployees.map((employee: any) => (
                          <div key={employee.employeeId} className="group p-6 border border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 hover:border-[#00b576] hover:shadow-sm transition-all duration-300">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                <span className="text-lg font-bold text-emerald-700">
                                  {employee.employeeName?.charAt(0) || "E"}
                                </span>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg text-[#1a2937]">{employee.employeeName}</h3>
                                <p className="text-sm text-gray-600">{employee.department || "No Department"}</p>
                              </div>
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                {employee.balances.length} leave types
                              </Badge>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                              {employee.balances.map((balance: any) => {
                                const percentage = (balance.usedDays / balance.totalDays) * 100;
                                return (
                                  <div key={balance.id} className="p-4 border border-gray-200 rounded-lg bg-white hover:border-emerald-200 transition-colors duration-300">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-sm font-medium capitalize text-gray-700">
                                        {balance.leaveType}
                                      </p>
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${
                                          balance.remainingDays > 0 
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-rose-50 text-rose-700 border-rose-200"
                                        }`}
                                      >
                                        {balance.remainingDays} left
                                      </Badge>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Used</span>
                                        <span className="font-medium text-rose-600">{balance.usedDays}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Total</span>
                                        <span className="font-medium text-[#1a2937]">{balance.totalDays}</span>
                                      </div>
                                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-[#00b576] to-emerald-400 rounded-full transition-all duration-1000"
                                          style={{ width: `${Math.min(percentage, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 pt-8 border-t">
                          <div className="text-sm text-gray-500">
                            Showing {startIndex + 1} to {Math.min(endIndex, employeeBalancesList.length)} of {employeeBalancesList.length} employees
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                // Show first page, last page, current page, and pages around current
                                if (
                                  page === 1 ||
                                  page === totalPages ||
                                  (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                  return (
                                    <Button
                                      key={page}
                                      variant={currentPage === page ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setCurrentPage(page)}
                                      className={`w-10 ${
                                        currentPage === page
                                          ? "bg-gradient-to-r from-[#00b576] to-emerald-500 text-white"
                                          : "border-gray-300 hover:border-[#00b576] hover:bg-emerald-50"
                                      }`}
                                    >
                                      {page}
                                    </Button>
                                  );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                  return <span key={page} className="px-2 text-gray-400">...</span>;
                                }
                                return null;
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50"
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <ApplyLeaveDialog
        open={isApplyDialogOpen}
        onOpenChange={setIsApplyDialogOpen}
        onSuccess={() => {
          fetchLeaveRequests();
          fetchLeaveBalances();
        }}
      />
      <LeaveApprovalDialog
        leave={selectedLeave}
        onClose={() => setSelectedLeave(null)}
        onEdit={(leave) => setLeaveToEdit(leave)}
        onSuccess={() => {
          fetchLeaveRequests();
          fetchLeaveBalances();
          if (canViewAll) {
            fetchAllEmployeesBalances();
          }
        }}
      />
      <EditLeaveDialog
        leave={leaveToEdit}
        onClose={() => setLeaveToEdit(null)}
        onSuccess={() => {
          fetchLeaveRequests();
          fetchLeaveBalances();
          if (canViewAll) {
            fetchAllEmployeesBalances();
          }
        }}
      />
      <AssignLeaveQuotaDialog
        open={isAssignQuotaDialogOpen}
        onOpenChange={setIsAssignQuotaDialogOpen}
        onSuccess={() => {
          fetchLeaveBalances();
          if (canViewAll) {
            fetchAllEmployeesBalances();
          }
        }}
      />
    </div>
  );
}