"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Award, TrendingUp, Users, Search, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { checkPunctualityEligibility, calculateAttendanceStats } from "@/lib/attendance-utils";
import { AddIncentiveDialog } from "@/components/incentives/add-incentive-dialog";

interface IncentiveWithEmployee {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: string;
  amount: number;
  description?: string;
  year: number;
  month: number;
  awardedBy: string;
  createdAt: string;
}

export default function IncentivesPage() {
  const { user, hasPermission } = useAuth();
  const [incentives, setIncentives] = useState<IncentiveWithEmployee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canManageIncentives = hasPermission("manage_incentives") || hasPermission("manage_team_incentives");
  const canViewAll = hasPermission("view_all_incentives");
  const canViewTeam = hasPermission("view_team_incentives");

  useEffect(() => {
    fetchIncentives();
    fetchDepartments();
    fetchEmployees();
  }, []);

  const [employees, setEmployees] = useState<any[]>([]);

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

  const fetchIncentives = async () => {
    try {
      const response = await fetch("/api/incentives");
      if (response.ok) {
        const data = await response.json();
        setIncentives(data);
      }
    } catch (error) {
      console.error("Failed to fetch incentives:", error);
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

  // Filter incentives based on role
  let visibleIncentives = incentives;

  if (canViewAll) {
    // Super admin and HR see all incentives
    visibleIncentives = incentives;
  } else if (canViewTeam) {
    // Manager sees only their department's incentives
    const managerDepartmentId = employees.find((e: any) => e.userId === user?.id)?.departmentId;
    if (managerDepartmentId) {
      const departmentEmployeeIds = employees
        .filter((e: any) => e.departmentId === managerDepartmentId)
        .map((e: any) => e.id);
      visibleIncentives = incentives.filter((i) => departmentEmployeeIds.includes(i.employeeId));
    }
  } else {
    // Employee sees only their own incentives
    visibleIncentives = incentives.filter((i) => i.employeeId === user?.employeeId);
  }

  const filteredIncentives = visibleIncentives.filter((incentive) => {
    const matchesSearch =
      incentive.employeeName?.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment =
      departmentFilter === "all" || incentive.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  // Calculate stats
  const stats = {
    totalIncentives: visibleIncentives.length,
    totalAmount: visibleIncentives.reduce((sum, i) => sum + i.amount, 0),
    punctualityIncentives: visibleIncentives.filter((i) => i.type === "punctuality").length,
    performanceIncentives: visibleIncentives.filter((i) => i.type === "performance").length,
  };

  // Punctuality eligibility check removed - will be handled by backend

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "punctuality":
        return <Badge variant="success">Punctuality</Badge>;
      case "performance":
        return <Badge variant="default">Performance</Badge>;
      case "bonus":
        return <Badge variant="secondary">Bonus</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div>
      <Header
        title="Incentives & Rewards"
        description="Manage employee incentives and punctuality rewards"
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Incentives</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalIncentives}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs.{stats.totalAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Punctuality Awards</CardTitle>
              <Award className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.punctualityIncentives}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canManageIncentives && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Incentive
            </Button>
          )}
        </div>

        {/* Incentives Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Awarded On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncentives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No incentives found
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncentives.map((incentive: any) => (
                    <TableRow key={incentive.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {incentive.employeeName || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {incentive.department || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(incentive.type)}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        Rs.{incentive.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {incentive.year && incentive.month ? format(new Date(incentive.year, incentive.month - 1), "MMMM yyyy") : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {incentive.description || "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(incentive.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddIncentiveDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchIncentives}
      />
    </div>
  );
}

