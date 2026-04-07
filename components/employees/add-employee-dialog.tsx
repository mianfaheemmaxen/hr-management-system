"use client";

import { useState, useEffect } from "react";
import { UserRole, Gender } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAlert } from "@/components/ui/use-alert";
import { Check, ChevronsUpDown, Link2, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  firstName: string;
  lastName: string;
}

interface BiometricEmployee {
  id: string;
  empCode: string;
  name: string;
  department: string;
  position: string;
  isLinked: boolean;
  linkedTo: string | null;
}

export function AddEmployeeDialog({ open, onOpenChange, onSuccess }: AddEmployeeDialogProps) {
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [biometricEmployees, setBiometricEmployees] = useState<BiometricEmployee[]>([]);
  const [loadingBiometric, setLoadingBiometric] = useState(false);
  const [biometricOpen, setBiometricOpen] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    departmentId: "",
    designation: "",
    managerId: "",
    role: "employee" as UserRole,
    dateOfJoining: new Date().toISOString().split("T")[0],
    employeeCode: "",
    biometricId: "",
    employmentStatus: "probation",
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

  // Fetch departments, managers, and biometric employees
  useEffect(() => {
    if (open) {
      fetchDepartments();
      fetchManagers();
      fetchBiometricEmployees();
    }
  }, [open]);

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

  const fetchManagers = async () => {
    try {
      const response = await fetch("/api/employees?role=manager,hr_manager");
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      }
    } catch (error) {
      console.error("Failed to fetch managers:", error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password || "password123",
          phone: formData.phone,
          departmentId: formData.departmentId || null,
          designation: formData.designation,
          managerId: formData.managerId || null,
          role: formData.role,
          dateOfJoining: formData.dateOfJoining,
          employeeCode: formData.employeeCode,
          biometricId: formData.biometricId || null,
          employmentStatus: formData.employmentStatus,
          gender: formData.gender || null,
          dateOfBirth: formData.dateOfBirth || null,
          nationality: formData.nationality || null,
          probationCompleteDate: formData.probationCompleteDate || null,
          emergencyContactName: formData.emergencyContactName || null,
          emergencyContactNumber: formData.emergencyContactNumber || null,
          emergencyContactRelation: formData.emergencyContactRelation || null,
          cnicNumber: formData.cnicNumber || null,
          passportNumber: formData.passportNumber || null,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        resetForm();
        if (onSuccess) onSuccess();
        showAlert({
          type: "success",
          message: "Employee created successfully",
        });
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to create employee",
        });
      }
    } catch (error) {
      console.error("Failed to create employee:", error);
      showAlert({
        type: "error",
        message: "Failed to create employee",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      departmentId: "",
      designation: "",
      managerId: "",
      role: "employee",
      dateOfJoining: new Date().toISOString().split("T")[0],
      employeeCode: "",
      biometricId: "",
      employmentStatus: "probation",
      gender: "",
      dateOfBirth: "",
      nationality: "",
      probationCompleteDate: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      emergencyContactRelation: "",
      cnicNumber: "",
      passportNumber: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new employee record. Documents can be uploaded after the employee is created.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeCode">Employee Code *</Label>
                <Input
                  id="employeeCode"
                  value={formData.employeeCode}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeCode: e.target.value })
                  }
                  placeholder="e.g., EMP001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="biometricId">Biometric ID (Optional)</Label>
              <Popover open={biometricOpen} onOpenChange={setBiometricOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={biometricOpen}
                    className={cn(
                      "w-full justify-between",
                      !formData.biometricId && "text-muted-foreground"
                    )}
                    disabled={loadingBiometric}
                  >
                    {formData.biometricId ? (
                      (() => {
                        const selected = biometricEmployees.find(
                          (emp) => emp.id === formData.biometricId
                        );
                        return selected
                          ? `${selected.empCode} - ${selected.name}`
                          : "Select biometric employee";
                      })()
                    ) : loadingBiometric ? (
                      "Loading..."
                    ) : (
                      "Select biometric employee"
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or code..." />
                    <CommandEmpty>No biometric employee found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {/* None option */}
                      <CommandItem
                        value="none-option"
                        onSelect={() => {
                          setFormData({ ...formData, biometricId: "" });
                          setBiometricOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !formData.biometricId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-muted-foreground">None</span>
                      </CommandItem>

                      {/* Biometric employees */}
                      {biometricEmployees.map((bioEmp) => (
                        <CommandItem
                          key={bioEmp.id}
                          value={`${bioEmp.empCode} ${bioEmp.name} ${bioEmp.department}`}
                          onSelect={() => {
                            setFormData({ ...formData, biometricId: bioEmp.id });
                            setBiometricOpen(false);
                          }}
                          disabled={bioEmp.isLinked}
                          className={bioEmp.isLinked ? "opacity-50" : ""}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.biometricId === bioEmp.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            {bioEmp.isLinked ? (
                              <Link2Off className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Link2 className="h-4 w-4 text-green-500" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">
                                {bioEmp.empCode} - {bioEmp.name}
                              </div>
                              {bioEmp.department && (
                                <div className="text-xs text-muted-foreground">
                                  {bioEmp.department}
                                </div>
                              )}
                              {bioEmp.isLinked && bioEmp.linkedTo && (
                                <div className="text-xs text-red-500">
                                  Already linked to {bioEmp.linkedTo}
                                </div>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Link this employee to biometric attendance system.
                <span className="inline-flex items-center gap-1 ml-1">
                  <Link2 className="h-3 w-3 text-green-500" /> = Available,
                  <Link2Off className="h-3 w-3 text-muted-foreground" /> = Already linked
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Leave blank for default (password123)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender || "not_selected"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value === "not_selected" ? "" : value as Gender })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_selected">Select gender</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                <Input
                  id="dateOfJoining"
                  type="date"
                  value={formData.dateOfJoining}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfJoining: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, departmentId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation *</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData({ ...formData, designation: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="hr_manager">HR Manager</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager">Reporting Manager</Label>
                <Select
                  value={formData.managerId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, managerId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managers.map((mgr) => (
                      <SelectItem key={mgr.id} value={mgr.id}>
                        {mgr.firstName} {mgr.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentStatus">Employment Status *</Label>
              <Select
                value={formData.employmentStatus}
                onValueChange={(value) =>
                  setFormData({ ...formData, employmentStatus: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Personal Information Section */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4">Personal Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) =>
                      setFormData({ ...formData, nationality: e.target.value })
                    }
                    placeholder="e.g., Pakistani"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnicNumber">CNIC Number</Label>
                  <Input
                    id="cnicNumber"
                    value={formData.cnicNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, cnicNumber: e.target.value })
                    }
                    placeholder="XXXXX-XXXXXXX-X"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passportNumber">Passport Number</Label>
                  <Input
                    id="passportNumber"
                    value={formData.passportNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, passportNumber: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="probationCompleteDate">Probation Complete Date</Label>
                <Input
                  id="probationCompleteDate"
                  type="date"
                  value={formData.probationCompleteDate}
                  onChange={(e) =>
                    setFormData({ ...formData, probationCompleteDate: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4">Emergency Contact</h3>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContactName: e.target.value })
                  }
                  placeholder="Full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactNumber">Contact Number</Label>
                  <Input
                    id="emergencyContactNumber"
                    value={formData.emergencyContactNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, emergencyContactNumber: e.target.value })
                    }
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelation">Relationship</Label>
                  <Select
                    value={formData.emergencyContactRelation || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, emergencyContactRelation: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select relationship</SelectItem>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

