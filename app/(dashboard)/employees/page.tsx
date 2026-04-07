"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Eye, Edit, UserX } from "lucide-react";
import Link from "next/link";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import { useAlert } from "@/components/ui/use-alert";

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  departmentId: string;
  designation: string;
  role: string;
  status: string;
  employmentStatus: string;
  dateOfJoining: string;
  profileImage?: string;
}

interface Department {
  id: string;
  name: string;
}

export default function EmployeesPage() {
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert, showConfirm } = useAlert();

  const canManageEmployees = hasPermission("manage_employees");

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
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

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment =
      departmentFilter === "all" || emp.department === departmentFilter;
    const matchesStatus =
      statusFilter === "all" || emp.status === statusFilter;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const handleDeactivate = async (id: string) => {
    const confirmed = await showConfirm({
      title: "Deactivate Employee",
      message: "Are you sure you want to deactivate this employee? They will no longer have access to the system.",
      confirmText: "Deactivate",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive", isActive: false }),
      });
      if (response.ok) {
        fetchEmployees();
        showAlert({
          type: "success",
          message: "Employee deactivated successfully",
        });
      } else {
        showAlert({
          type: "error",
          message: "Failed to deactivate employee",
        });
      }
    } catch (error) {
      console.error("Failed to deactivate employee:", error);
      showAlert({
        type: "error",
        message: "Failed to deactivate employee",
      });
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active", isActive: true }),
      });
      if (response.ok) {
        fetchEmployees();
      }
    } catch (error) {
      console.error("Failed to activate employee:", error);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "hr_manager":
        return "default";
      case "manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Header
        title="Employee Management"
        description="Manage all employee records and profiles"
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card className="border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-1 gap-4 items-center flex-wrap">
                <div className="relative flex-1 max-w-sm min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 bg-white border-gray-200 focus:border-[#1a2937] focus:ring-[#1a2937]"
                  />
                </div>
                {hasPermission("view_all_employees") && (
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[180px] bg-white border-gray-200">
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
                )}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-white border-gray-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {canManageEmployees && (
                <Button 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-gradient-to-r from-[#1a2937] to-[#2d4158] hover:from-[#2d4158] hover:to-[#1a2937] text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-0">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 border-b border-gray-200">
                    <TableHead className="font-semibold text-[#1a2937]">Employee</TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">Employee ID</TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">Department</TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">Designation</TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">Role</TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">Employment</TableHead>
                    <TableHead className="font-semibold text-[#1a2937]">Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-12 w-12 text-gray-300" />
                          <p className="text-lg font-medium">No employees found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow 
                        key={employee.id}
                        className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-100"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                              <AvatarImage src={employee.profileImage} />
                              <AvatarFallback className="bg-gradient-to-br from-[#1a2937] to-[#2d4158] text-white font-semibold">
                                {getInitials(employee.firstName, employee.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-[#1a2937]">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {employee.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-700">{employee.employeeId}</TableCell>
                        <TableCell className="text-gray-700">{employee.department}</TableCell>
                        <TableCell className="text-gray-700">{employee.designation}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(employee.role)} className="shadow-sm">
                            {employee.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={employee.employmentStatus === "permanent" ? "default" : "outline"}
                            className="shadow-sm"
                          >
                            {employee.employmentStatus === "permanent" ? "Permanent" : "Probation"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={employee.status === "active" ? "success" : "secondary"}
                            className="shadow-sm"
                          >
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="hover:bg-blue-100 transition-colors duration-200"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link href={`/employees/${employee.id}`} className="cursor-pointer">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                                </Link>
                              </DropdownMenuItem>
                              {canManageEmployees && (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/employees/${employee.id}/edit`} className="cursor-pointer">
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {employee.status === "active" ? (
                                    <DropdownMenuItem
                                      onClick={() => handleDeactivate(employee.id)}
                                      className="text-destructive cursor-pointer"
                                    >
                                      <UserX className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleActivate(employee.id)}
                                      className="cursor-pointer"
                                    >
                                      <UserX className="mr-2 h-4 w-4" />
                                      Activate
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <AddEmployeeDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchEmployees}
      />
    </div>
  );
}

