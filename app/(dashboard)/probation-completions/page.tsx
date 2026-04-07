"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserCheck,
  Search,
  Eye,
  Plus,
  Loader2,
  AlertCircle,
  Calendar,
  Building2,
  Briefcase,
  Clock,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import Link from "next/link";
import { AddEvaluationDialog } from "@/components/employees/add-evaluation-dialog";

interface ProbationEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  daysInProbation: number;
}

export default function ProbationCompletionsPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState<ProbationEmployee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<ProbationEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [departments, setDepartments] = useState<string[]>([]);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<ProbationEmployee | null>(null);

  useEffect(() => {
    if (!hasPermission("view_all_employees") && !hasPermission("manage_employees")) {
      router.push("/dashboard");
      return;
    }
    fetchProbationEmployees();
  }, []);

  const fetchProbationEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/employees");
      if (response.ok) {
        const data = await response.json();
        
        // Filter employees: probation status AND >= 90 days since joining
        const probationEmployees = data
          .filter((emp: any) => {
            const isOnProbation = emp.employmentStatus === "probation";
            const daysSinceJoining = differenceInDays(new Date(), parseISO(emp.dateOfJoining));
            return isOnProbation && daysSinceJoining >= 90;
          })
          .map((emp: any) => ({
            id: emp.id,
            employeeId: emp.employeeId,
            firstName: emp.firstName,
            lastName: emp.lastName,
            department: emp.department || "N/A",
            designation: emp.designation || "N/A",
            dateOfJoining: emp.dateOfJoining,
            daysInProbation: differenceInDays(new Date(), parseISO(emp.dateOfJoining)),
          }))
          .sort((a: ProbationEmployee, b: ProbationEmployee) => b.daysInProbation - a.daysInProbation);

        setEmployees(probationEmployees);
        setFilteredEmployees(probationEmployees);

        // Extract unique departments
        const uniqueDepts = Array.from(new Set(probationEmployees.map((emp: ProbationEmployee) => emp.department)));
        setDepartments(uniqueDepts.filter((dept): dept is string => dept !== "N/A"));
      }
    } catch (error) {
      console.error("Failed to fetch probation employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter employees based on search and department
  useEffect(() => {
    let filtered = employees;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (emp) =>
          emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter((emp) => emp.department === departmentFilter);
    }

    setFilteredEmployees(filtered);
  }, [searchQuery, departmentFilter, employees]);

  if (!hasPermission("view_all_employees") && !hasPermission("manage_employees")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header
        title="Probation Completions"
        description="Employees who have completed 90+ days of probation period"
      />

      <div className="p-6 space-y-6">
        {/* Stats Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800">Total Employees Pending Review</p>
                <p className="text-3xl font-bold text-emerald-900 mt-2">{filteredEmployees.length}</p>
              </div>
              <div className="p-4 rounded-full bg-white/50">
                <UserCheck className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search by Name or ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Filter by Department</label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Probation Employees ({filteredEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No employees found matching your criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Date of Joining</TableHead>
                      <TableHead>Days in Probation</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {employee.employeeId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            {employee.department}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            {employee.designation}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {format(parseISO(employee.dateOfJoining), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              employee.daysInProbation >= 120
                                ? "bg-rose-100 text-rose-800"
                                : employee.daysInProbation >= 105
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {employee.daysInProbation} days
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/employees/${employee.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View Profile
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setEvaluationDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Evaluation
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Evaluation Dialog */}
      {selectedEmployee && (
        <AddEvaluationDialog
          open={evaluationDialogOpen}
          onOpenChange={setEvaluationDialogOpen}
          employeeId={selectedEmployee.id}
          employeeName={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
          onSuccess={() => {
            // Optionally refresh the list or show a success message
            fetchProbationEmployees();
          }}
        />
      )}
    </div>
  );
}


