"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  CalendarDays,
  User,
  FileText,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Check,
  X,
  AlertCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    pendingLeaves: 0,
    pendingFines: 0,
  });
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingFines, setPendingFines] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch employees
      const employeesRes = await fetch("/api/employees");
      const employees = employeesRes.ok ? await employeesRes.json() : [];

      // Fetch today's attendance
      const today = format(new Date(), "yyyy-MM-dd");
      const attendanceRes = await fetch(`/api/attendance?date=${today}`);
      const attendance = attendanceRes.ok ? await attendanceRes.json() : [];

      // Fetch leave requests
      const leavesRes = await fetch("/api/leaves");
      const leaves = leavesRes.ok ? await leavesRes.json() : [];

      // Fetch fines
      const finesRes = await fetch("/api/fines");
      const fines = finesRes.ok ? await finesRes.json() : [];

      // Fetch leave balances
      const balancesRes = await fetch("/api/leave-balance");
      const balances = balancesRes.ok ? await balancesRes.json() : [];
      setLeaveBalances(balances);

      // Filter data based on user role
      let filteredEmployees = employees;
      let filteredAttendance = attendance;
      let filteredLeaves = leaves;
      let filteredFines = fines;

      if (user?.role === "manager") {
        // Manager sees only their department's data
        const managerDepartmentId = employees.find(
          (e: any) => e.userId === user.id,
        )?.departmentId;
        if (managerDepartmentId) {
          filteredEmployees = employees.filter(
            (e: any) => e.departmentId === managerDepartmentId,
          );
          const departmentEmployeeIds = filteredEmployees.map((e: any) => e.id);
          filteredAttendance = attendance.filter((a: any) =>
            departmentEmployeeIds.includes(a.employeeId),
          );
          filteredLeaves = leaves.filter((l: any) =>
            departmentEmployeeIds.includes(l.employeeId),
          );
          filteredFines = fines.filter((f: any) =>
            departmentEmployeeIds.includes(f.employeeId),
          );
        }
      } else if (user?.role === "employee") {
        // Employee sees only their own data
        const employeeRecord = employees.find((e: any) => e.userId === user.id);
        if (employeeRecord) {
          filteredEmployees = [employeeRecord];
          filteredAttendance = attendance.filter(
            (a: any) => a.employeeId === employeeRecord.id,
          );
          filteredLeaves = leaves.filter(
            (l: any) => l.employeeId === employeeRecord.id,
          );
          filteredFines = fines.filter(
            (f: any) => f.employeeId === employeeRecord.id,
          );
        }
      }
      // super_admin and hr_manager see all data (no filtering)

      const activeEmployees = filteredEmployees.filter(
        (e: any) => e.status === "active",
      );
      const pendingLeavesData = filteredLeaves.filter(
        (l: any) => l.status === "pending" || l.status === "manager_approved",
      );
      const pendingFinesData = filteredFines.filter(
        (f: any) => f.status === "suggested",
      );

      setPendingLeaves(pendingLeavesData);
      setPendingFines(pendingFinesData);

      setStats({
        totalEmployees: activeEmployees.length,
        presentToday: filteredAttendance.filter(
          (a: any) => a.status === "on_time" || a.status === "late",
        ).length,
        lateToday: filteredAttendance.filter((a: any) => a.status === "late")
          .length,
        absentToday:
          activeEmployees.length -
          filteredAttendance.filter(
            (a: any) => a.status !== "absent" && a.status !== "leave",
          ).length,
        pendingLeaves: pendingLeavesData.length,
        pendingFines: pendingFinesData.length,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEmployeesLabel = () => {
    if (user?.role === "employee") return "My Profile";
    if (user?.role === "manager") return "Team Members";
    return "Total Employees";
  };

  const getAttendanceLabel = () => {
    if (user?.role === "employee") return "My Attendance";
    if (user?.role === "manager") return "Team Attendance";
    return "Today's Attendance";
  };

  const getLeavesLabel = () => {
    if (user?.role === "employee") return "My Leaves";
    if (user?.role === "manager") return "Team Leaves";
    return "Pending Leaves";
  };

  const getFinesLabel = () => {
    if (user?.role === "employee") return "My Fines";
    if (user?.role === "manager") return "Team Fines";
    return "Pending Fines";
  };

  // Status colors for badges
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200";
      case "manager_approved":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200";
      case "approved":
        return "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-[#1a2937]/5">
      <Header
        title={`Welcome back, ${user?.firstName}!`}
        description={`Here's what's happening today - ${format(new Date(), "EEEE, MMMM d, yyyy")}`}
      />

      <div className="p-6 space-y-8">
        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Employees Card */}
          <Link href="/employees" className="block">
            <Card className="group relative overflow-hidden border border-gray-200 bg-[#f5faff] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#1a2937]">  
                    {getEmployeesLabel()}
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-emerald-50 group-hover:scale-110 transition-transform duration-300">
                    {user?.role === "employee" ? (
                      <User className="h-4 w-4 text-[#00b576]" />
                    ) : (
                      <Users className="h-4 w-4 text-[#00b576]" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-[#1a2937] animate-in fade-in duration-500">
                  {user?.role === "employee" ? "1" : stats.totalEmployees}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {user?.role === "employee"
                    ? "Your profile"
                    : "Active employees"}
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Attendance Card */}
          <Link href="/attendance" className="block">
            <Card className="group relative overflow-hidden border border-gray-200 bg-[#f5faff] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 delay-100 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#1a2937]">
                    {getAttendanceLabel()}
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-[#1a2937] animate-in fade-in duration-500">
                  {stats.presentToday}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {user?.role === "employee"
                    ? stats.lateToday > 0
                      ? "Late today"
                      : "On time"
                    : `${stats.lateToday} late arrivals`}
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Leaves Card */}
          <Link href="/leaves" className="block">
            <Card className="group relative overflow-hidden border border-gray-200 bg-[#f5faff] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 delay-200 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#1a2937]">
                    {getLeavesLabel()}
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-amber-50 group-hover:scale-110 transition-transform duration-300">
                    <CalendarDays className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-[#1a2937] animate-in fade-in duration-500">
                  {stats.pendingLeaves}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {user?.role === "employee"
                    ? "Pending requests"
                    : "Awaiting approval"}
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Fines Card */}
          <Link href="/fines" className="block">
            <Card className="group relative overflow-hidden border border-gray-200 bg-[#f5faff] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 delay-300 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#1a2937]">
                    {getFinesLabel()}
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-rose-50 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-4 w-4 text-rose-500" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-[#1a2937] animate-in fade-in duration-500">
                  {stats.pendingFines}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {user?.role === "employee"
                    ? "Pending fines"
                    : "Require review"}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Leave Balance for Employees / Attendance for Others */}
            {user?.role === "employee" ? (
              <Card className="border border-gray-200 bg-[#f5faff] shadow-sm hover:shadow-md transition-shadow duration-300 animate-in fade-in">
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
                    <Link href="/leaves">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#00b576] border-[#00b576] hover:bg-[#00b576] hover:text-white transition-all duration-300"
                      >
                        Apply Leave
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {leaveBalances.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                        <Calendar className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">
                        No leave quota assigned yet.
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Please contact HR to assign your leave quota.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {leaveBalances.map((balance: any, index) => (
                        <div
                          key={balance.id}
                          className="group p-4 rounded-lg border border-gray-200 hover:border-[#00b576] hover:shadow-sm transition-all duration-300 animate-in fade-in"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors duration-300">
                              <CalendarDays className="h-5 w-5 text-[#00b576]" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-[#1a2937] capitalize">
                                {balance.leaveType.replace("_", " ")}
                              </p>
                              <p className="text-xs text-gray-600">
                                {balance.usedDays} used of {balance.totalDays}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium text-[#1a2937]">
                                {balance.remainingDays} days left
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#00b576] to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                                style={{
                                  width: `${Math.min(
                                    (balance.usedDays / balance.totalDays) *
                                      100,
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Attendance Overview for Non-Employees */
              <Card className="border border-gray-200 bg-[#f5faff] shadow-sm hover:shadow-md transition-shadow duration-300 animate-in fade-in">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-[#1a2937]">
                        {user?.role === "manager"
                          ? "Team Attendance Today"
                          : "Today's Attendance Overview"}
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        Real-time attendance status
                      </CardDescription>
                    </div>
                    <Link href="/attendance">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#00b576] hover:text-[#00b576] hover:bg-emerald-50 group"
                      >
                        View Details
                        <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded-lg border border-green-200 bg-green-50 animate-in fade-in">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-green-100">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">On Time</p>
                          <p className="text-2xl font-bold text-[#1a2937]">
                            {stats.presentToday - stats.lateToday}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 animate-in fade-in delay-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-yellow-100">
                          <Clock className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Late Arrivals</p>
                          <p className="text-2xl font-bold text-[#1a2937]">
                            {stats.lateToday}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-red-200 bg-red-50 animate-in fade-in delay-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-red-100">
                          <X className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Absent</p>
                          <p className="text-2xl font-bold text-[#1a2937]">
                            {stats.absentToday}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 animate-in fade-in delay-300">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-blue-100">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">On Leave</p>
                          <p className="text-2xl font-bold text-[#1a2937]">0</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-[#1a2937] to-[#2d4158] text-white animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Employees</p>
                        <p className="text-2xl font-bold">
                          {stats.totalEmployees}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-90">Present Today</p>
                        <p className="text-2xl font-bold">
                          {stats.presentToday}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Pending Leaves */}
          <div className="space-y-8">
            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 animate-in fade-in slide-in-from-right-2 flex flex-col max-h-[calc(100vh-12rem)]">
              <CardHeader className="border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-[#1a2937]">
                      {user?.role === "employee"
                        ? "My Leave Requests"
                        : user?.role === "manager"
                          ? "Team Leave Requests"
                          : "Pending Leaves"}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {user?.role === "employee"
                        ? "Your recent applications"
                        : "Requires attention"}
                    </CardDescription>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50">
                    <CalendarDays className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 overflow-y-auto flex-1">
                {pendingLeaves.length === 0 ? (
                  <div className="text-center py-8 animate-in fade-in">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                      <Calendar className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">
                      No pending leave requests
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {user?.role === "employee"
                        ? "You have no pending leave requests"
                        : "All leave requests are processed"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingLeaves.map((leave: any, index) => (
                      <div
                        key={leave.id}
                        className="group p-4 rounded-lg border border-gray-200 hover:border-[#00b576] hover:shadow-sm transition-all duration-300 animate-in fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="space-y-1">
                            <p className="font-medium text-[#1a2937] group-hover:text-[#00b576] transition-colors duration-300">
                              {leave.employeeName || "Unknown Employee"}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {leave.startDate
                                  ? format(new Date(leave.startDate), "MMM d")
                                  : "-"}
                              </span>
                              <span>→</span>
                              <span>
                                {leave.endDate
                                  ? format(new Date(leave.endDate), "MMM d")
                                  : "-"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 capitalize">
                              {leave.leaveType?.replace("_", " ") ||
                                "Annual Leave"}
                            </p>
                          </div>
                          <Badge
                            className={`${getStatusColor(
                              leave.status,
                            )} transition-all duration-300 group-hover:scale-105`}
                          >
                            {leave.status?.replace("_", " ") || "pending"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {leave.reason
                              ? leave.reason.length > 30
                                ? `${leave.reason.substring(0, 30)}...`
                                : leave.reason
                              : "No reason provided"}
                          </span>
                          <Link
                            href="/leaves"
                            className="inline-flex items-center text-xs text-[#00b576] hover:text-[#00b576] font-medium group/link"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                            <ChevronRight className="ml-1 h-3 w-3 group-hover/link:translate-x-1 transition-transform duration-300" />
                          </Link>
                        </div>
                      </div>
                    ))}

                    <Link href="/leaves">
                      <Button
                        variant="outline"
                        className="w-full mt-4 border-gray-300 hover:border-[#00b576] hover:bg-[#00b576] hover:text-white transition-all duration-300 animate-in fade-in"
                      >
                        View All in Leaves Page
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
