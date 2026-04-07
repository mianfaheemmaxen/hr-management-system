"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  User,
  Edit,
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  FileText,
  TrendingUp,
  Award,
  Percent,
  Loader2,
  Users,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Download,
  Eye,
} from "lucide-react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  subYears,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { DocumentPreviewGrid } from "@/components/employees/document-preview-grid";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { EmployeeEvaluation } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditEvaluationDialog } from "@/components/employees/edit-evaluation-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission, user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [unpaidLeaveUsage, setUnpaidLeaveUsage] = useState<number>(0);
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [employeeFines, setEmployeeFines] = useState<any[]>([]);
  const [employeeIncentives, setEmployeeIncentives] = useState<any[]>([]);
  const [employeeHistory, setEmployeeHistory] = useState<any[]>([]);
  const [employeeDocuments, setEmployeeDocuments] = useState<any[]>([]);
  const [monthlyDeductibles, setMonthlyDeductibles] = useState<any[]>([]);
  const [employeeEvaluations, setEmployeeEvaluations] = useState<
    EmployeeEvaluation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceDateRange, setAttendanceDateRange] =
    useState<string>("current_month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] =
    useState<string>("all");

  // Fines date range filter - default to current month
  const [finesDateFrom, setFinesDateFrom] = useState<Date | undefined>(
    startOfMonth(new Date()),
  );
  const [finesDateTo, setFinesDateTo] = useState<Date | undefined>(
    endOfMonth(new Date()),
  );

  // Evaluation edit/delete state
  const [editEvaluationDialogOpen, setEditEvaluationDialogOpen] =
    useState(false);
  const [selectedEvaluation, setSelectedEvaluation] =
    useState<EmployeeEvaluation | null>(null);
  const [deleteEvaluationDialogOpen, setDeleteEvaluationDialogOpen] =
    useState(false);
  const [evaluationToDelete, setEvaluationToDelete] =
    useState<EmployeeEvaluation | null>(null);
  const [isDeletingEvaluation, setIsDeletingEvaluation] = useState(false);
  const [evaluationAlert, setEvaluationAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const employeeId = params.id as string;

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    if (attendanceDateRange === "custom") {
      // Use custom dates if provided
      return {
        startDate: customStartDate || format(startOfMonth(now), "yyyy-MM-dd"),
        endDate: customEndDate || format(endOfMonth(now), "yyyy-MM-dd"),
      };
    }

    switch (attendanceDateRange) {
      case "current_month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case "last_3_months":
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case "last_year":
        const oneYearAgo = subYears(now, 1);
        startDate = startOfMonth(oneYearAgo);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  };

  useEffect(() => {
    fetchEmployee();
    fetchLeaveBalances();
    fetchUnpaidLeaveUsage();
    fetchFines();
    fetchIncentives();
    fetchHistory();
    fetchDocuments();
    fetchEvaluations();
    fetchMonthlyDeductibles();
  }, [employeeId]);

  useEffect(() => {
    fetchAttendance();
  }, [employeeId, attendanceDateRange, customStartDate, customEndDate]);

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setEmployee(data);
      }
    } catch (error) {
      console.error("Failed to fetch employee:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      const response = await fetch(
        `/api/leave-balance?employeeId=${employeeId}`,
      );
      if (response.ok) {
        const data = await response.json();
        // Filter out unpaid leave (it has no quota)
        setLeaveBalances(
          data.filter((balance: any) => balance.leaveType !== "unpaid"),
        );
      }
    } catch (error) {
      console.error("Failed to fetch leave balances:", error);
    }
  };

  const fetchUnpaidLeaveUsage = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/leaves?employeeId=${employeeId}`);
      if (response.ok) {
        const leaves = await response.json();
        // Calculate total unpaid leave days used this year (approved only)
        const unpaidDays = leaves
          .filter(
            (leave: any) =>
              leave.leaveType === "unpaid" &&
              leave.status === "approved" &&
              new Date(leave.startDate).getFullYear() === currentYear,
          )
          .reduce((total: number, leave: any) => total + leave.totalDays, 0);
        setUnpaidLeaveUsage(unpaidDays);
      }
    } catch (error) {
      console.error("Failed to fetch unpaid leave usage:", error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const response = await fetch(
        `/api/attendance?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`,
      );
      if (response.ok) {
        const data = await response.json();
        setEmployeeAttendance(data);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    }
  };

  const fetchFines = async () => {
    try {
      const response = await fetch(`/api/fines?employeeId=${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setEmployeeFines(data);
      }
    } catch (error) {
      console.error("Failed to fetch fines:", error);
    }
  };

  const fetchIncentives = async () => {
    try {
      const response = await fetch(`/api/incentives?employeeId=${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setEmployeeIncentives(data);
      }
    } catch (error) {
      console.error("Failed to fetch incentives:", error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/history`);
      if (response.ok) {
        const data = await response.json();
        setEmployeeHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setEmployeeDocuments(data);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  const fetchEvaluations = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/evaluations`);
      if (response.ok) {
        const data = await response.json();
        setEmployeeEvaluations(data);
      }
    } catch (error) {
      console.error("Failed to fetch evaluations:", error);
    }
  };

  const fetchMonthlyDeductibles = async () => {
    try {
      const response = await fetch(
        `/api/monthly-deductible-fines?employeeId=${employeeId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setMonthlyDeductibles(data);
      }
    } catch (error) {
      console.error("Failed to fetch monthly deductibles:", error);
    }
  };

  const handleDeleteEvaluation = async () => {
    if (!evaluationToDelete) return;

    setIsDeletingEvaluation(true);
    try {
      const response = await fetch(
        `/api/employees/${employeeId}/evaluations/${evaluationToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setEvaluationAlert({
          type: "success",
          message: "Evaluation deleted successfully",
        });
        fetchEvaluations();
        setDeleteEvaluationDialogOpen(false);
        setEvaluationToDelete(null);
        // Auto-hide alert after 3 seconds
        setTimeout(() => setEvaluationAlert(null), 3000);
      } else {
        const error = await response.json();
        setEvaluationAlert({
          type: "error",
          message: error.error || "Failed to delete evaluation",
        });
      }
    } catch (error) {
      console.error("Failed to delete evaluation:", error);
      setEvaluationAlert({
        type: "error",
        message: "Failed to delete evaluation",
      });
    } finally {
      setIsDeletingEvaluation(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalFines: employeeFines
      .filter((f) => f.status === "implemented")
      .reduce((sum, f) => sum + f.amount, 0),
    totalIncentives: employeeIncentives.reduce((sum, i) => sum + i.amount, 0),
    attendanceOnTime: employeeAttendance.filter((a) => a.status === "on_time")
      .length,
    attendanceLate: employeeAttendance.filter((a) => a.status === "late")
      .length,
    attendanceTotal: employeeAttendance.length,
    documentsCount: employeeDocuments.length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <User className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-gray-900">
              Loading Employee Profile
            </p>
            <p className="text-sm text-gray-600">
              Fetching employee details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-6 max-w-md mx-4">
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-rose-100 to-rose-50 rounded-full flex items-center justify-center">
              <User className="h-12 w-12 text-rose-600" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Employee Not Found
            </h1>
            <p className="text-gray-600">
              The employee you're looking for doesn't exist or has been removed
              from the system.
            </p>
          </div>
          <Button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500";
      case "inactive":
        return "bg-rose-500";
      case "on_leave":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header
        title="Employee Profile"
        description={`Complete profile and activity for ${employee.firstName} ${employee.lastName}`}
      />

      <div className="p-6 space-y-6">
        {/* Back Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="group hover:bg-emerald-50 hover:text-emerald-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            {hasPermission("manage_employees") && (
              <Link href={`/employees/${employee.id}/edit`}>
                <Button className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Profile Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-emerald-300/5 rounded-2xl -m-4"></div>
          <Card className="relative border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
                {/* Avatar Section */}
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full blur-sm opacity-50"></div>
                  <Avatar className="h-32 w-32 border-4 border-white shadow-2xl relative">
                    <AvatarImage src={employee.profileImage} />
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-800">
                      {getInitials(employee.firstName, employee.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status Indicator */}
                  <div
                    className={`absolute bottom-3 right-3 w-5 h-5 ${getStatusColor(employee.status)} rounded-full border-2 border-white shadow-lg`}
                  ></div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-3xl font-bold text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </h2>
                      <div className="flex gap-2">
                        <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0">
                          {employee.role.replace("_", " ")}
                        </Badge>
                        <Badge
                          className={`${employee.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"} border-0`}
                        >
                          {employee.status}
                        </Badge>
                        <Badge
                          className={`${employee.employmentStatus === "permanent" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"} border-0`}
                        >
                          {employee.employmentStatus === "permanent"
                            ? "Permanent"
                            : "Probation"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl text-gray-700 font-medium">
                        {employee.designation}
                      </p>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="h-4 w-4" />
                        <span>{employee.department}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Employee ID</p>
                      <p className="font-mono font-semibold text-gray-900">
                        {employee.employeeId}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Email</p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <p className="font-medium text-gray-900 truncate">
                          {employee.email}
                        </p>
                      </div>
                    </div>
                    {employee.phone && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Phone</p>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <p className="font-medium text-gray-900">
                            {employee.phone}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Joined</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <p className="font-medium text-gray-900">
                          {employee.dateOfJoining
                            ? format(
                                new Date(employee.dateOfJoining),
                                "MMM d, yyyy",
                              )
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    Leave Balance
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 mt-2">
                    {leaveBalances.reduce((sum, b) => sum + b.remainingDays, 0)}{" "}
                    days
                  </p>
                </div>
                <div className="p-3 rounded-full bg-white/50">
                  <CalendarIcon className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Attendance Rate
                  </p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">
                    {employeeAttendance.length > 0
                      ? `${Math.round(((stats.attendanceOnTime + stats.attendanceLate) / stats.attendanceTotal) * 100)}%`
                      : "0%"}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-white/50">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-rose-50 to-rose-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rose-800">
                    Total Fines
                  </p>
                  <p className="text-2xl font-bold text-rose-900 mt-2">
                    Rs.{stats.totalFines.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-white/50">
                  <DollarSign className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">
                    Total Incentives
                  </p>
                  <p className="text-2xl font-bold text-purple-900 mt-2">
                    Rs.{stats.totalIncentives.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-white/50">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Personal Information & Emergency Contact Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information Card */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    Personal Information
                  </CardTitle>
                  <CardDescription>Employee personal details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Date of Birth */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-2 rounded-md bg-blue-100">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    Date of Birth
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {employee.dateOfBirth ? (
                      format(new Date(employee.dateOfBirth), "MMM d, yyyy")
                    ) : (
                      <span className="text-gray-400 font-normal">
                        Not provided
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Nationality */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-2 rounded-md bg-emerald-100">
                  <User className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    Nationality
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {employee.nationality || (
                      <span className="text-gray-400 font-normal">
                        Not provided
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* CNIC Number */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-2 rounded-md bg-purple-100">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    CNIC Number
                  </p>
                  <p className="text-base font-semibold text-gray-900 font-mono">
                    {employee.cnicNumber || (
                      <span className="text-gray-400 font-normal">
                        Not provided
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Passport Number */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-2 rounded-md bg-indigo-100">
                  <FileText className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    Passport Number
                  </p>
                  <p className="text-base font-semibold text-gray-900 font-mono">
                    {employee.passportNumber || (
                      <span className="text-gray-400 font-normal">
                        Not provided
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Probation Complete Date */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-2 rounded-md bg-amber-100">
                  <Calendar className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    Probation Complete Date
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {employee.probationCompleteDate ? (
                      format(
                        new Date(employee.probationCompleteDate),
                        "MMM d, yyyy",
                      )
                    ) : (
                      <span className="text-gray-400 font-normal">
                        Not provided
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact Card */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-rose-100 to-rose-50">
                  <Phone className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Emergency Contact</CardTitle>
                  <CardDescription>
                    Contact person in case of emergency
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Contact Name */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-2 rounded-md bg-rose-100">
                  <User className="h-4 w-4 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    Contact Name
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {employee.emergencyContactName || (
                      <span className="text-gray-400 font-normal">
                        Not provided
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Contact Number */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-2 rounded-md bg-rose-100">
                  <Phone className="h-4 w-4 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    Contact Number
                  </p>
                  <p className="text-base font-semibold text-gray-900 font-mono">
                    {employee.emergencyContactNumber || (
                      <span className="text-gray-400 font-normal">
                        Not provided
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Relationship */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-2 rounded-md bg-rose-100">
                  <Users className="h-4 w-4 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    Relationship
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {employee.emergencyContactRelation || (
                      <span className="text-gray-400 font-normal">
                        Not provided
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Empty state message if no emergency contact */}
              {!employee.emergencyContactName &&
                !employee.emergencyContactNumber &&
                !employee.emergencyContactRelation && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      No emergency contact information provided
                    </p>
                    {hasPermission("manage_employees") && (
                      <Link href={`/employees/${employeeId}/edit`}>
                        <Button variant="outline" size="sm" className="mt-3">
                          <Edit className="mr-2 h-3 w-3" />
                          Add Emergency Contact
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <Tabs defaultValue="leave-balance" className="w-full">
              <div className="border-b">
                <TabsList className="bg-transparent h-16 px-6 gap-1">
                  <TabsTrigger
                    value="leave-balance"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Leave Balance
                  </TabsTrigger>
                  <TabsTrigger
                    value="attendance"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Attendance
                  </TabsTrigger>
                  <TabsTrigger
                    value="fines"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Fines
                  </TabsTrigger>
                  <TabsTrigger
                    value="monthly-deductibles"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                  >
                    <Percent className="mr-2 h-4 w-4" />
                    Deductibles
                  </TabsTrigger>
                  {user?.role !== "manager" && (
                    <TabsTrigger
                      value="incentives"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                    >
                      <Award className="mr-2 h-4 w-4" />
                      Incentives
                    </TabsTrigger>
                  )}
                  {user?.role !== "manager" && (
                    <TabsTrigger
                      value="documents"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Documents
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="evaluations"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                  >
                    <Award className="mr-2 h-4 w-4" />
                    Evaluations
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    History
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="leave-balance" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          Leave Balance ({new Date().getFullYear()})
                        </h3>
                        <p className="text-gray-600">
                          Annual leave allocations and usage
                        </p>
                      </div>
                    </div>

                    {leaveBalances.length === 0 ? (
                      <div className="text-center py-12">
                        <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                          No leave balance initialized for this employee
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {leaveBalances.map((balance) => (
                          <Card
                            key={balance.id}
                            className="border border-gray-200 hover:border-emerald-300 transition-colors hover:shadow-lg"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-600 capitalize">
                                  {balance.leaveType} Leave
                                </p>
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                >
                                  {balance.remainingDays}/{balance.totalDays}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                                    style={{
                                      width: `${(balance.remainingDays / balance.totalDays) * 100}%`,
                                    }}
                                  ></div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>
                                    Used:{" "}
                                    {balance.totalDays - balance.remainingDays}{" "}
                                    days
                                  </span>
                                  <span>
                                    Remaining: {balance.remainingDays} days
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Card className="border border-gray-200 hover:border-blue-300 transition-colors hover:shadow-lg">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-medium text-gray-600">
                                Unpaid Leaves Used
                              </p>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                This Year
                              </Badge>
                            </div>
                            <div className="text-center py-4">
                              <p className="text-3xl font-bold text-blue-600">
                                {unpaidLeaveUsage}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                approved days
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="attendance" className="mt-0 space-y-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <CardTitle className="text-lg font-bold text-gray-900">
                              Attendance Records
                            </CardTitle>
                            <CardDescription>
                              Daily check-in/out history and status
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-3">
                            <Select
                              value={attendanceStatusFilter}
                              onValueChange={setAttendanceStatusFilter}
                            >
                              <SelectTrigger className="w-[160px] border-gray-300 focus:border-emerald-400 focus:ring-emerald-400">
                                <SelectValue placeholder="Filter by status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="on_time">On Time</SelectItem>
                                <SelectItem value="late">Late</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="half_day">
                                  Half Day
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={attendanceDateRange}
                              onValueChange={setAttendanceDateRange}
                            >
                              <SelectTrigger className="w-[200px] border-gray-300 focus:border-emerald-400 focus:ring-emerald-400">
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="current_month">
                                  Current Month
                                </SelectItem>
                                <SelectItem value="last_month">
                                  Last Month
                                </SelectItem>
                                <SelectItem value="last_3_months">
                                  Last 3 Months
                                </SelectItem>
                                <SelectItem value="last_year">
                                  Last Year
                                </SelectItem>
                                <SelectItem value="custom">
                                  Custom Range
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {attendanceDateRange === "custom" && (
                          <div className="flex items-end gap-4">
                            <div className="flex-1">
                              <Label
                                htmlFor="start-date"
                                className="text-sm font-medium text-gray-700"
                              >
                                From Date
                              </Label>
                              <Input
                                id="start-date"
                                type="date"
                                value={customStartDate}
                                onChange={(e) =>
                                  setCustomStartDate(e.target.value)
                                }
                                className="mt-1 border-gray-300 focus:border-emerald-400 focus:ring-emerald-400"
                              />
                            </div>
                            <div className="flex-1">
                              <Label
                                htmlFor="end-date"
                                className="text-sm font-medium text-gray-700"
                              >
                                To Date
                              </Label>
                              <Input
                                id="end-date"
                                type="date"
                                value={customEndDate}
                                onChange={(e) =>
                                  setCustomEndDate(e.target.value)
                                }
                                className="mt-1 border-gray-300 focus:border-emerald-400 focus:ring-emerald-400"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const filteredAttendance =
                          attendanceStatusFilter === "all"
                            ? employeeAttendance
                            : employeeAttendance.filter(
                                (record) =>
                                  record.status === attendanceStatusFilter,
                              );

                        return filteredAttendance.length === 0 ? (
                          <div className="text-center py-12">
                            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">
                              {attendanceStatusFilter === "all"
                                ? "No attendance records for selected period"
                                : `No ${attendanceStatusFilter.replace("_", " ")} records for selected period`}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b">
                              <p className="text-sm text-gray-600">
                                Showing {filteredAttendance.length} of{" "}
                                {employeeAttendance.length} records
                              </p>
                            </div>
                            {[...filteredAttendance].reverse().map((record) => (
                              <div
                                key={record.id}
                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-emerald-50/30 transition-colors duration-200"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                                      <CalendarIcon className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {format(
                                          new Date(record.date),
                                          "EEEE, MMMM d, yyyy",
                                        )}
                                      </p>
                                      <div className="flex items-center gap-4 mt-1">
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          Check-in: {record.checkIn || "N/A"}
                                        </p>
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          Check-out: {record.checkOut || "N/A"}
                                        </p>
                                        {record.lateMinutes > 0 && (
                                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                                            Late: {record.lateMinutes} min
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <Badge
                                  className={
                                    record.status === "on_time"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                      : record.status === "late"
                                        ? "bg-amber-100 text-amber-800 border-amber-200"
                                        : "bg-gray-100 text-gray-800 border-gray-200"
                                  }
                                >
                                  {record.status.replace("_", " ")}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="fines" className="mt-0 space-y-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <CardTitle className="text-lg font-bold text-gray-900">
                              Fines History
                            </CardTitle>
                            <CardDescription>
                              Record of fines and penalties
                            </CardDescription>
                          </div>

                          {/* Date Range Filter */}
                          <div className="flex gap-2 items-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-[140px] justify-start text-left font-normal border-gray-300 hover:border-emerald-400"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {finesDateFrom
                                    ? format(finesDateFrom, "MMM d")
                                    : "From"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0 border border-gray-200"
                                align="start"
                              >
                                <CalendarComponent
                                  selected={finesDateFrom}
                                  onSelect={(date) =>
                                    date && setFinesDateFrom(date)
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                            <span className="text-gray-500 text-sm">to</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-[140px] justify-start text-left font-normal border-gray-300 hover:border-emerald-400"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {finesDateTo
                                    ? format(finesDateTo, "MMM d")
                                    : "To"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0 border border-gray-200"
                                align="start"
                              >
                                <CalendarComponent
                                  selected={finesDateTo}
                                  onSelect={(date) =>
                                    date && setFinesDateTo(date)
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFinesDateFrom(startOfMonth(new Date()));
                                setFinesDateTo(endOfMonth(new Date()));
                              }}
                              className="text-gray-500 hover:text-gray-700 hover:border-gray-400"
                            >
                              Reset
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const filteredFines = employeeFines.filter((fine) => {
                          if (!finesDateFrom && !finesDateTo) return true;

                          const fineDate = parseISO(fine.date);
                          if (finesDateFrom && finesDateTo) {
                            return isWithinInterval(fineDate, {
                              start: finesDateFrom,
                              end: finesDateTo,
                            });
                          } else if (finesDateFrom) {
                            return fineDate >= finesDateFrom;
                          } else if (finesDateTo) {
                            return fineDate <= finesDateTo;
                          }
                          return true;
                        });

                        return filteredFines.length === 0 ? (
                          <div className="text-center py-12">
                            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">
                              No fines found for the selected date range
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredFines.map((fine) => (
                              <div
                                key={fine.id}
                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-rose-50/30 transition-colors duration-200"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center">
                                      <DollarSign className="h-4 w-4 text-rose-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {format(
                                          new Date(fine.date),
                                          "MMMM d, yyyy",
                                        )}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                          variant="outline"
                                          className="bg-blue-50 text-blue-700 border-blue-200 capitalize"
                                        >
                                          {fine.type.replace("_", " ")}
                                        </Badge>
                                        {fine.type === "late_arrival" &&
                                          fine.lateMinutes > 0 && (
                                            <span className="text-sm text-amber-600">
                                              {fine.lateMinutes} minutes late
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                  {fine.reason && (
                                    <p className="text-sm text-gray-600 mt-2 ml-13">
                                      {fine.reason}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-xl text-rose-600">
                                    Rs.{fine.amount}
                                  </p>
                                  <Badge
                                    className={
                                      fine.status === "implemented"
                                        ? "bg-rose-100 text-rose-800 border-rose-200"
                                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    }
                                  >
                                    {fine.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent
                  value="monthly-deductibles"
                  className="mt-0 space-y-6"
                >
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900">
                          Monthly Deductible Summary
                        </CardTitle>
                        <CardDescription>
                          Summary of calculated deductible amounts for salary
                          deductions (excludes waived fines)
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {monthlyDeductibles.length === 0 ? (
                        <div className="text-center py-12">
                          <Percent className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">
                            No monthly deductible records found
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Summary cards for the most recent month */}
                          {monthlyDeductibles.length > 0 &&
                            (() => {
                              const latest = monthlyDeductibles[0];
                              const monthNames = [
                                "Jan",
                                "Feb",
                                "Mar",
                                "Apr",
                                "May",
                                "Jun",
                                "Jul",
                                "Aug",
                                "Sep",
                                "Oct",
                                "Nov",
                                "Dec",
                              ];
                              return (
                                <div className="mb-6">
                                  <div className="flex items-center gap-2 mb-4">
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                      Latest Record
                                    </Badge>
                                    <p className="text-sm font-medium text-gray-600">
                                      {monthNames[latest.month - 1]}{" "}
                                      {latest.year}
                                    </p>
                                  </div>
                                  <div className="grid gap-4 sm:grid-cols-3">
                                    <Card className="border border-blue-200 hover:border-blue-300 transition-colors">
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <DollarSign className="h-5 w-5 text-blue-600" />
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-600">
                                              Actual Fines
                                            </p>
                                            <p className="text-xl font-bold text-blue-600">
                                              Rs.
                                              {latest.actualAmount?.toLocaleString() ||
                                                0}
                                            </p>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    <Card className="border border-purple-200 hover:border-purple-300 transition-colors">
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                            <Percent className="h-5 w-5 text-purple-600" />
                                          </div>
                                          <div>
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <p className="text-xs text-gray-600">
                                                  Calculated
                                                </p>
                                                <p className="text-xl font-bold text-purple-600">
                                                  Rs.
                                                  {latest.deductibleAmount?.toLocaleString() ||
                                                    0}
                                                </p>
                                              </div>
                                              <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-mono">
                                                {latest.multiplier}x
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    <Card className="border border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:border-emerald-400 transition-colors">
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <Shield className="h-5 w-5 text-emerald-600" />
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-600">
                                              Final Deductible
                                            </p>
                                            <p className="text-xl font-bold text-emerald-700">
                                              Rs.
                                              {latest.finalDeductibleAmount?.toLocaleString() ||
                                                0}
                                            </p>
                                            {latest.finalDeductibleAmount !==
                                              latest.deductibleAmount && (
                                              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                Adjusted
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                </div>
                              );
                            })()}

                          {/* History table */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                              History
                            </h4>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left font-medium text-gray-900">
                                        Month
                                      </th>
                                      <th className="px-4 py-3 text-right font-medium text-gray-900">
                                        Actual Fines
                                      </th>
                                      <th className="px-4 py-3 text-right font-medium text-gray-900">
                                        Multiplier
                                      </th>
                                      <th className="px-4 py-3 text-right font-medium text-gray-900">
                                        Calculated
                                      </th>
                                      <th className="px-4 py-3 text-right font-medium text-gray-900">
                                        Final Deductible
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {monthlyDeductibles.map((record: any) => {
                                      const monthNames = [
                                        "Jan",
                                        "Feb",
                                        "Mar",
                                        "Apr",
                                        "May",
                                        "Jun",
                                        "Jul",
                                        "Aug",
                                        "Sep",
                                        "Oct",
                                        "Nov",
                                        "Dec",
                                      ];
                                      const isAdjusted =
                                        record.finalDeductibleAmount !==
                                        record.deductibleAmount;
                                      return (
                                        <tr
                                          key={record.id}
                                          className="hover:bg-gray-50 transition-colors"
                                        >
                                          <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-gray-900">
                                                {monthNames[record.month - 1]}{" "}
                                                {record.year}
                                              </span>
                                              {record.month ===
                                                new Date().getMonth() + 1 &&
                                                record.year ===
                                                  new Date().getFullYear() && (
                                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                                    Current
                                                  </Badge>
                                                )}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-right text-gray-600">
                                            Rs.
                                            {record.actualAmount?.toLocaleString() ||
                                              0}
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <Badge className="bg-gray-100 text-gray-700 border-gray-200 font-mono">
                                              {record.multiplier}x
                                            </Badge>
                                          </td>
                                          <td className="px-4 py-3 text-right text-gray-600">
                                            Rs.
                                            {record.deductibleAmount?.toLocaleString() ||
                                              0}
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <span
                                                className={`font-semibold ${isAdjusted ? "text-orange-600" : "text-emerald-600"}`}
                                              >
                                                Rs.
                                                {record.finalDeductibleAmount?.toLocaleString() ||
                                                  0}
                                              </span>
                                              {isAdjusted && (
                                                <AlertCircle className="h-3 w-3 text-orange-500" />
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>

                          {/* Legend */}
                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5" />
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Note:</span>
                              <span className="text-orange-600 mx-1">*</span>
                              indicates amounts manually adjusted by HR/Admin
                              from the calculated value.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="incentives" className="mt-0 space-y-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        Incentives History
                      </CardTitle>
                      <CardDescription>
                        Rewards and bonuses received
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {employeeIncentives.length === 0 ? (
                        <div className="text-center py-12">
                          <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">
                            No incentives recorded
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {employeeIncentives.map((incentive) => {
                            const monthNames = [
                              "Jan",
                              "Feb",
                              "Mar",
                              "Apr",
                              "May",
                              "Jun",
                              "Jul",
                              "Aug",
                              "Sep",
                              "Oct",
                              "Nov",
                              "Dec",
                            ];
                            const monthName = monthNames[incentive.month - 1];
                            return (
                              <div
                                key={incentive.id}
                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-emerald-50/30 transition-colors duration-200"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                      <Award className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 capitalize">
                                          {incentive.type.replace("_", " ")}
                                        </Badge>
                                        <p className="font-medium text-gray-900">
                                          {monthName} {incentive.year}
                                        </p>
                                      </div>
                                      {incentive.description && (
                                        <p className="text-sm text-gray-600 mt-2">
                                          {incentive.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-2xl text-emerald-600">
                                    Rs.{incentive.amount}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents" className="mt-0 space-y-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        Employee Documents
                      </CardTitle>
                      <CardDescription>
                        Uploaded files and documents
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DocumentPreviewGrid
                        employeeId={employeeId}
                        documents={employeeDocuments}
                        onDocumentDeleted={() => {
                          fetchDocuments();
                        }}
                        canDelete={hasPermission("manage_employees")}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="evaluations" className="mt-0 space-y-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        Employee Evaluations
                      </CardTitle>
                      <CardDescription>
                        Tests and interviews conducted during probation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {employeeEvaluations.length === 0 ? (
                        <div className="text-center py-12">
                          <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">
                            No evaluations recorded
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Marks</TableHead>
                                <TableHead>Retaken</TableHead>
                                <TableHead>Notes</TableHead>
                                {hasPermission("manage_employees") && (
                                  <TableHead className="text-right">
                                    Actions
                                  </TableHead>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {employeeEvaluations.map((evaluation) => (
                                <TableRow key={evaluation.id}>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={
                                        evaluation.evaluationType === "test"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-purple-50 text-purple-700 border-purple-200"
                                      }
                                    >
                                      {evaluation.evaluationType === "test"
                                        ? "Test"
                                        : "Interview"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {evaluation.name}
                                  </TableCell>
                                  <TableCell>
                                    {format(
                                      parseISO(evaluation.evaluationDate),
                                      "MMM dd, yyyy",
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={
                                        evaluation.status === "pass"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : "bg-red-50 text-red-700 border-red-200"
                                      }
                                    >
                                      {evaluation.status === "pass"
                                        ? "Pass"
                                        : "Fail"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {evaluation.evaluationType === "test" &&
                                    evaluation.totalMarks !== null &&
                                    evaluation.obtainedMarks !== null
                                      ? `${evaluation.obtainedMarks}/${evaluation.totalMarks}`
                                      : "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    {evaluation.wasRetaken ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-amber-50 text-amber-700 border-amber-200"
                                      >
                                        Yes
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-500">No</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {evaluation.notes || (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  {hasPermission("manage_employees") && (
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 px-3"
                                          onClick={() => {
                                            setSelectedEvaluation(evaluation);
                                            setEditEvaluationDialogOpen(true);
                                          }}
                                        >
                                          <Edit className="h-3 w-3 mr-1" />
                                          Edit
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => {
                                            setEvaluationToDelete(evaluation);
                                            setDeleteEvaluationDialogOpen(true);
                                          }}
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-0 space-y-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        Employee History
                      </CardTitle>
                      <CardDescription>
                        Profile changes and updates timeline
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {employeeHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">
                            No history records found
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {employeeHistory.map((record) => (
                            <div
                              key={record.id}
                              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge className="bg-gray-100 text-gray-700 border-gray-200 capitalize">
                                    {record.field
                                      .replace(/([A-Z])/g, " $1")
                                      .trim()}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {format(
                                      new Date(record.changedAt),
                                      "MMM dd, yyyy 'at' hh:mm a",
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm mt-3">
                                  <span className="text-gray-500 line-through bg-gray-100 px-3 py-1.5 rounded-md">
                                    {record.oldValue || "None"}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                  <span className="font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md">
                                    {record.newValue || "None"}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                  Changed by:{" "}
                                  <span className="font-medium">
                                    {record.changedBy}
                                  </span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Evaluation Dialog */}
      {selectedEvaluation && (
        <EditEvaluationDialog
          open={editEvaluationDialogOpen}
          onOpenChange={setEditEvaluationDialogOpen}
          employeeId={employeeId}
          employeeName={`${employee.firstName} ${employee.lastName}`}
          evaluation={selectedEvaluation}
          onSuccess={() => {
            setEvaluationAlert({
              type: "success",
              message: "Evaluation updated successfully",
            });
            fetchEvaluations();
            // Auto-hide alert after 3 seconds
            setTimeout(() => setEvaluationAlert(null), 3000);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteEvaluationDialogOpen}
        onOpenChange={setDeleteEvaluationDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Evaluation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this evaluation? This action
              cannot be undone.
              {evaluationToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">
                    {evaluationToDelete.name}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Type:{" "}
                    {evaluationToDelete.evaluationType === "test"
                      ? "Test"
                      : "Interview"}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingEvaluation}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvaluation}
              disabled={isDeletingEvaluation}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingEvaluation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success/Error Alert */}
      {evaluationAlert && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <Alert
            className={
              evaluationAlert.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }
          >
            <AlertDescription className="flex items-center gap-2">
              {evaluationAlert.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {evaluationAlert.message}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
