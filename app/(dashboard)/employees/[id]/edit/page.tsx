"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserRole, Gender } from "@/lib/types";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Link2,
  Link2Off,
  Save,
  X,
  Upload,
  FileText,
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Shield,
  Calendar,
  Users,
  Loader2,
  AlertCircle,
  Badge
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlert } from "@/components/ui/use-alert";
import { DocumentUpload } from "@/components/employees/document-upload";
import { DocumentList } from "@/components/employees/document-list";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission, user } = useAuth();
  const { showAlert } = useAlert();
  const [employee, setEmployee] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [biometricEmployees, setBiometricEmployees] = useState<any[]>([]);
  const [loadingBiometric, setLoadingBiometric] = useState(false);
  const [biometricOpen, setBiometricOpen] = useState(false);

  const employeeId = params.id as string;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    departmentId: "",
    designation: "",
    managerId: "",
    role: "employee" as UserRole,
    joinDate: "",
    employmentStatus: "probation",
    biometricId: "",
    gender: "" as Gender | "",
    dateOfBirth: "",
    nationality: "",
    probationCompleteDate: "",
    emergencyContactName: "",
    emergencyContactNumber: "",
    emergencyContactRelation: "",
    cnicNumber: "",
    passportNumber: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    fetchData();
    fetchDocuments();
    fetchBiometricEmployees();
  }, [employeeId]);

  const fetchData = async () => {
    try {
      const [empRes, deptRes, allEmpRes] = await Promise.all([
        fetch(`/api/employees/${employeeId}`),
        fetch("/api/departments"),
        fetch("/api/employees"),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployee(empData);
        setFormData({
          firstName: empData.firstName,
          lastName: empData.lastName,
          email: empData.email,
          phone: empData.phone || "",
          departmentId: empData.departmentId || "",
          designation: empData.designation,
          managerId: empData.managerId || "",
          role: empData.role,
          joinDate: empData.dateOfJoining || empData.joinDate,
          employmentStatus: empData.employmentStatus || "probation",
          biometricId: empData.biometricId || "",
          gender: empData.gender || "",
          dateOfBirth: empData.dateOfBirth ? new Date(empData.dateOfBirth).toISOString().split("T")[0] : "",
          nationality: empData.nationality || "",
          probationCompleteDate: empData.probationCompleteDate ? new Date(empData.probationCompleteDate).toISOString().split("T")[0] : "",
          emergencyContactName: empData.emergencyContactName || "",
          emergencyContactNumber: empData.emergencyContactNumber || "",
          emergencyContactRelation: empData.emergencyContactRelation || "",
          cnicNumber: empData.cnicNumber || "",
          passportNumber: empData.passportNumber || "",
        });
      }

      if (deptRes.ok) setDepartments(await deptRes.json());
      if (allEmpRes.ok) setEmployees(await allEmpRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  const fetchBiometricEmployees = async () => {
    try {
      setLoadingBiometric(true);
      const response = await fetch("/api/biometric/employees?page_size=1000");
      if (response.ok) {
        const data = await response.json();
        setBiometricEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Failed to fetch biometric employees:", error);
      // Don't show error to user, biometric integration is optional
    } finally {
      setLoadingBiometric(false);
    }
  };

  if (!hasPermission("manage_employees")) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <div className="p-4 rounded-full bg-rose-100 mx-auto w-20 h-20 flex items-center justify-center">
            <Shield className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to manage employees.</p>
          <Button 
            onClick={() => router.back()}
            className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-[#00b576] animate-spin" />
          <p className="text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <div className="p-4 rounded-full bg-rose-100 mx-auto w-20 h-20 flex items-center justify-center">
            <User className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Not Found</h1>
          <p className="text-gray-600">The employee you're looking for doesn't exist.</p>
          <Button 
            onClick={() => router.back()}
            className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const managers = employees.filter(
    (e) =>
      (e.role === "manager" || e.role === "hr_manager") &&
      e.status === "active" &&
      e.id !== employeeId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          departmentId: formData.departmentId || undefined,
          designation: formData.designation,
          managerId: formData.managerId || undefined,
          role: formData.role,
          employmentStatus: formData.employmentStatus,
          biometricId: formData.biometricId || undefined,
          gender: formData.gender || undefined,
          dateOfJoining: formData.joinDate || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
          nationality: formData.nationality || undefined,
          probationCompleteDate: formData.probationCompleteDate || undefined,
          emergencyContactName: formData.emergencyContactName || undefined,
          emergencyContactNumber: formData.emergencyContactNumber || undefined,
          emergencyContactRelation: formData.emergencyContactRelation || undefined,
          cnicNumber: formData.cnicNumber || undefined,
          passportNumber: formData.passportNumber || undefined,
        }),
      });

      if (response.ok) {
        showAlert({
          type: "success",
          message: "Employee updated successfully",
        });
        router.push(`/employees/${employeeId}`);
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to update employee",
        });
      }
    } catch (error) {
      console.error("Failed to update employee:", error);
      showAlert({
        type: "error",
        message: "Failed to update employee",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header
        title="Edit Employee"
        description={`Update details for ${employee.firstName} ${employee.lastName}`}
      />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50 group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Profile
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Employee ID:</span>
            <span className="font-mono font-semibold text-gray-900">{employee.employeeId}</span>
          </div>
        </div>

        {/* Edit Form Card */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-400/5"></div>
          <CardHeader className="relative border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50">
                <User className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Employee Information
                </CardTitle>
                <CardDescription>
                  Update personal, employment, and biometric details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative pt-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-md bg-blue-100">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <User className="h-3 w-3" />
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      required
                      className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      required
                      className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email *
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11 pl-10"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      Phone
                    </Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11 pl-10"
                      />
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="gender" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      Gender
                    </Label>
                    <Select
                      value={formData.gender || "not_selected"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, gender: value === "not_selected" ? "" : value as Gender })
                      }
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_selected" className="hover:bg-emerald-50">Select gender</SelectItem>
                        <SelectItem value="male" className="hover:bg-emerald-50">Male</SelectItem>
                        <SelectItem value="female" className="hover:bg-emerald-50">Female</SelectItem>
                        <SelectItem value="other" className="hover:bg-emerald-50">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say" className="hover:bg-emerald-50">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Date of Birth
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                      }
                      className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="nationality" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Nationality
                    </Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) =>
                        setFormData({ ...formData, nationality: e.target.value })
                      }
                      placeholder="e.g., Pakistani"
                      className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="cnicNumber" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Badge className="h-3 w-3" />
                      CNIC Number
                    </Label>
                    <Input
                      id="cnicNumber"
                      value={formData.cnicNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, cnicNumber: e.target.value })
                      }
                      placeholder="XXXXX-XXXXXXX-X"
                      className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="passportNumber" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Badge className="h-3 w-3" />
                      Passport Number
                    </Label>
                    <Input
                      id="passportNumber"
                      value={formData.passportNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, passportNumber: e.target.value })
                      }
                      className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="probationCompleteDate" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Probation Complete Date
                    </Label>
                    <Input
                      id="probationCompleteDate"
                      type="date"
                      value={formData.probationCompleteDate}
                      onChange={(e) =>
                        setFormData({ ...formData, probationCompleteDate: e.target.value })
                      }
                      className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="space-y-6 pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-md bg-rose-100">
                    <Phone className="h-4 w-4 text-rose-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="emergencyContactName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Contact Name
                  </Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) =>
                      setFormData({ ...formData, emergencyContactName: e.target.value })
                    }
                    placeholder="Full name"
                    className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="emergencyContactNumber" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      Contact Number
                    </Label>
                    <Input
                      id="emergencyContactNumber"
                      value={formData.emergencyContactNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, emergencyContactNumber: e.target.value })
                      }
                      placeholder="Phone number"
                      className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="emergencyContactRelation" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      Relationship
                    </Label>
                    <Select
                      value={formData.emergencyContactRelation || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, emergencyContactRelation: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="hover:bg-emerald-50">Select relationship</SelectItem>
                        <SelectItem value="Spouse" className="hover:bg-emerald-50">Spouse</SelectItem>
                        <SelectItem value="Parent" className="hover:bg-emerald-50">Parent</SelectItem>
                        <SelectItem value="Sibling" className="hover:bg-emerald-50">Sibling</SelectItem>
                        <SelectItem value="Child" className="hover:bg-emerald-50">Child</SelectItem>
                        <SelectItem value="Friend" className="hover:bg-emerald-50">Friend</SelectItem>
                        <SelectItem value="Other" className="hover:bg-emerald-50">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Employment Information Section */}
              <div className="space-y-6 pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-md bg-emerald-100">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Employment Information</h3>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="department" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
                      Department *
                    </Label>
                    <Select
                      value={formData.departmentId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, departmentId: value })
                      }
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id} className="hover:bg-emerald-50">
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="designation" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Briefcase className="h-3 w-3" />
                      Designation *
                    </Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) =>
                        setFormData({ ...formData, designation: e.target.value })
                      }
                      required
                      className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="role" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      Role *
                    </Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: UserRole) =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee" className="hover:bg-emerald-50">Employee</SelectItem>
                        <SelectItem value="manager" className="hover:bg-emerald-50">Manager</SelectItem>
                        <SelectItem value="hr_manager" className="hover:bg-emerald-50">HR Manager</SelectItem>
                        <SelectItem value="super_admin" className="hover:bg-emerald-50">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="manager" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      Reporting Manager
                    </Label>
                    <Select
                      value={formData.managerId || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, managerId: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11">
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="hover:bg-emerald-50">None</SelectItem>
                        {managers.map((mgr) => (
                          <SelectItem key={mgr.id} value={mgr.id} className="hover:bg-emerald-50">
                            {mgr.firstName} {mgr.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="joinDate" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Join Date *
                    </Label>
                    <div className="relative">
                      <Input
                        id="joinDate"
                        type="date"
                        value={formData.joinDate}
                        onChange={(e) =>
                          setFormData({ ...formData, joinDate: e.target.value })
                        }
                        required
                        className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11 pl-10"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="employmentStatus" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Briefcase className="h-3 w-3" />
                      Employment Status *
                    </Label>
                    <Select
                      value={formData.employmentStatus}
                      onValueChange={(value) =>
                        setFormData({ ...formData, employmentStatus: value })
                      }
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] h-11">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="probation" className="hover:bg-emerald-50">Probation</SelectItem>
                        <SelectItem value="permanent" className="hover:bg-emerald-50">Permanent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Biometric Integration Section */}
              <div className="space-y-6 pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-md bg-purple-100">
                    <Link2 className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Biometric Integration</h3>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Link2 className="h-3 w-3" />
                    Biometric ID (Optional)
                  </Label>
                  <Popover open={biometricOpen} onOpenChange={setBiometricOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={biometricOpen}
                        className={cn(
                          "w-full justify-between h-11 border-gray-300 hover:border-[#00b576] hover:bg-emerald-50",
                          !formData.biometricId && "text-gray-500"
                        )}
                        disabled={loadingBiometric}
                      >
                        <div className="flex items-center gap-2">
                          {loadingBiometric ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Loading biometric employees...</span>
                            </>
                          ) : formData.biometricId ? (
                            (() => {
                              const selected = biometricEmployees.find(
                                (emp: any) => emp.id === formData.biometricId
                              );
                              return selected ? (
                                <div className="flex items-center gap-2">
                                  <Link2 className="h-4 w-4 text-emerald-600" />
                                  <span>{selected.empCode} - {selected.name}</span>
                                </div>
                              ) : (
                                "Select biometric employee"
                              );
                            })()
                          ) : (
                            <>
                              <Link2Off className="h-4 w-4 text-gray-400" />
                              <span>Not linked</span>
                            </>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 border border-gray-200 shadow-lg" align="start">
                      <Command>
                        <div className="px-3 pt-3 pb-2 border-b">
                          <CommandInput placeholder="Search by name or code..." />
                        </div>
                        <CommandEmpty className="py-6 text-center text-gray-500">
                          No biometric employee found.
                        </CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {/* None option */}
                          <CommandItem
                            value="none-option"
                            onSelect={() => {
                              setFormData({ ...formData, biometricId: "" });
                              setBiometricOpen(false);
                            }}
                            className="flex items-center gap-2 hover:bg-emerald-50"
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                !formData.biometricId ? "opacity-100 text-emerald-600" : "opacity-0"
                              )}
                            />
                            <Link2Off className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500">None (Not linked)</span>
                          </CommandItem>

                          {/* Biometric employees */}
                          {biometricEmployees.map((bioEmp: any) => {
                            const isLinkedToOther = bioEmp.isLinked && bioEmp.id !== formData.biometricId;

                            return (
                              <CommandItem
                                key={bioEmp.id}
                                value={`${bioEmp.empCode} ${bioEmp.name} ${bioEmp.department}`}
                                onSelect={() => {
                                  if (!isLinkedToOther) {
                                    setFormData({ ...formData, biometricId: bioEmp.id });
                                    setBiometricOpen(false);
                                  }
                                }}
                                disabled={isLinkedToOther}
                                className={cn(
                                  "flex items-center gap-2 hover:bg-emerald-50",
                                  isLinkedToOther && "opacity-60 cursor-not-allowed"
                                )}
                              >
                                <Check
                                  className={cn(
                                    "h-4 w-4",
                                    formData.biometricId === bioEmp.id
                                      ? "opacity-100 text-emerald-600"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  {isLinkedToOther ? (
                                    <Link2Off className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Link2 className="h-4 w-4 text-emerald-600" />
                                  )}
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {bioEmp.empCode} - {bioEmp.name}
                                    </div>
                                    {bioEmp.department && (
                                      <div className="text-xs text-gray-500">
                                        {bioEmp.department}
                                      </div>
                                    )}
                                    {isLinkedToOther && bioEmp.linkedTo && (
                                      <div className="text-xs text-rose-600 flex items-center gap-1 mt-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Already linked to {bioEmp.linkedTo}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 mt-2">
                    <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600">
                      Link this employee to biometric attendance system.
                      <span className="inline-flex items-center gap-1 ml-1">
                        <Link2 className="h-3 w-3 text-emerald-600" /> = Available,
                        <Link2Off className="h-3 w-3 text-gray-400" /> = Already linked
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Documents Card */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Employee Documents</CardTitle>
                <CardDescription>
                  Upload and manage employee documents and files
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <Card className="border border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg">Upload New Document</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <DocumentUpload
                  employeeId={employeeId}
                  onUploadSuccess={() => {
                    fetchDocuments();
                  }}
                />
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">Existing Documents</CardTitle>
                  </div>
                  <Badge className="border-blue-200 text-blue-700">
                    {documents.length} files
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <DocumentList
                  employeeId={employeeId}
                  documents={documents}
                  onDocumentDeleted={() => {
                    fetchDocuments();
                  }}
                  canDelete={hasPermission("manage_employees")}
                />
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}