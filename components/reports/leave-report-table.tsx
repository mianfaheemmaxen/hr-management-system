"use client";

import { LeaveRequest, Employee } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";
import { Calendar, User, Building2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface LeaveReportTableProps {
  leaves: LeaveRequest[];
  employees: Employee[];
}

export function LeaveReportTable({ leaves, employees }: LeaveReportTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-24 justify-center"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 w-24 justify-center"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      case "pending":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 w-24 justify-center"><AlertCircle className="h-3 w-3" /> Pending</Badge>;
      case "manager_approved":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 w-28 justify-center">Manager Approved</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-600 border-gray-300 w-24 justify-center">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-600 border-gray-300">{status}</Badge>;
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
      sick: "text-rose-600 bg-rose-50 border-rose-200",
      annual: "text-emerald-600 bg-emerald-50 border-emerald-200",
      complementary: "text-blue-600 bg-blue-50 border-blue-200",
      unpaid: "text-gray-600 bg-gray-100 border-gray-300",
      maternity: "text-pink-600 bg-pink-50 border-pink-200",
      umrah: "text-purple-600 bg-purple-50 border-purple-200",
      half_day: "text-orange-600 bg-orange-50 border-orange-200",
      short_leave: "text-yellow-700 bg-yellow-50 border-yellow-200",
    };
    return (
      <Badge variant="outline" className={`${colors[type] || "text-gray-600 bg-gray-100 border-gray-300"}`}>
        {leaveTypeLabels[type] || type}
      </Badge>
    );
  };

  // Calculate summary stats
  const stats = {
    total: leaves.length,
    approved: leaves.filter(l => l.status === 'approved').length,
    pending: leaves.filter(l => l.status === 'pending').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
    totalDays: leaves.reduce((sum, leave) => {
      const days = differenceInDays(new Date(leave.endDate), new Date(leave.startDate)) + 1;
      return sum + days;
    }, 0)
  };

  // Sort by start date descending
  const sortedLeaves = [...leaves].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  return (
    <div className="space-y-4 p-8 pt-0">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leaves</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-md">
              <Calendar className="h-4 w-4 text-gray-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-semibold text-emerald-600 mt-1">{stats.approved}</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-md">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-md">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Days</p>
              <p className="text-2xl font-semibold text-blue-600 mt-1">{stats.totalDays}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-md">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Leave Report Table */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b">
          <CardTitle className="text-lg font-semibold">Leave Requests</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            {sortedLeaves.length} leave requests found
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-medium text-gray-700">Employee</TableHead>
                  <TableHead className="font-medium text-gray-700">Department</TableHead>
                  <TableHead className="font-medium text-gray-700">Leave Type</TableHead>
                  <TableHead className="font-medium text-gray-700">Period</TableHead>
                  <TableHead className="font-medium text-gray-700 text-center">Days</TableHead>
                  <TableHead className="font-medium text-gray-700 text-center">Status</TableHead>
                  <TableHead className="font-medium text-gray-700">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Calendar className="h-8 w-8 text-gray-300" />
                        <p className="text-gray-500">No leave requests found</p>
                        <p className="text-sm text-gray-400">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLeaves.map((leave) => {
                    const employee = employees.find((e) => e.id === leave.employeeId);
                    const days = differenceInDays(new Date(leave.endDate), new Date(leave.startDate)) + 1;
                    
                    return (
                      <TableRow key={leave.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                              <span className="text-sm font-medium text-gray-600">
                                {employee?.firstName?.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {employee?.firstName} {employee?.lastName}
                              </p>
                              <p className="text-xs text-gray-500">ID: {employee?.employeeId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-700">{employee?.department || "-"}</span>
                        </TableCell>
                        <TableCell>
                          {getLeaveTypeBadge(leave.leaveType)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {format(new Date(leave.startDate), "MMM d, yyyy")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {format(new Date(leave.endDate), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-medium text-gray-700">
                            {days} day{days !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(leave.status)}
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[200px] truncate text-gray-600 text-sm">
                            {leave.reason || "No reason provided"}
                          </p>
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
    </div>
  );
}