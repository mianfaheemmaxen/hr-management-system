// User Roles
export type UserRole = 'super_admin' | 'hr_manager' | 'manager' | 'employee';

// Employment Status
export type EmploymentStatus = 'active' | 'inactive';

// Attendance Status
export type AttendanceStatus = 'on_time' | 'late' | 'absent' | 'half_day' | 'leave';

// Leave Types
export type LeaveType = 'sick' | 'annual' | 'complementary' | 'unpaid' | 'maternity' | 'umrah' | 'half_day' | 'short_leave';

// Leave Status
export type LeaveStatus = 'pending' | 'manager_approved' | 'approved' | 'rejected' | 'cancelled';

// Fine Status
export type FineStatus = 'suggested' | 'approved' | 'waived' | 'paid';

// Gender type
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

// Evaluation Types
export type EvaluationType = 'test' | 'interview';
export type EvaluationStatus = 'pass' | 'fail';

// User/Employee interface
export interface Employee {
  id: string;
  employeeId: string; // e.g., EMP001
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  department: string;
  designation: string;
  managerId?: string; // Reference to manager's employee ID
  role: UserRole;
  status: EmploymentStatus;
  joinDate: string;
  profileImage?: string;
  gender?: Gender;
  dateOfBirth?: string;
  nationality?: string;
  probationCompleteDate?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelation?: string;
  cnicNumber?: string;
  passportNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// Attendance record
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:MM
  checkOut?: string; // HH:MM
  status: AttendanceStatus;
  lateMinutes: number;
  isCompensated: boolean;
  intimated: boolean; // Whether employee informed about absence
  intimatedReason?: string; // Reason provided when marking as intimated
  compensatedReason?: string;
  compensatedBy?: string;
  compensatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Leave Balance
export interface LeaveBalance {
  id: string;
  employeeId: string;
  year: number;
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

// Leave Request
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  managerComment?: string;
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  hrComment?: string;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Fine Types
export type FineType = 'late_arrival' | 'policy_violation' | 'misconduct' | 'other';

// Fine record
export interface Fine {
  id: string;
  employeeId: string;
  attendanceId?: string; // Reference to the attendance that triggered this fine (optional for manual fines)
  date: string;
  type: FineType;
  lateMinutes: number;
  reason?: string;
  amount: number;
  status: FineStatus;
  adjustedAmount?: number;
  adjustmentReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  waivedBy?: string;
  waivedAt?: string;
  waiverReason?: string; // Reason for waiving the fine (e.g., grace period)
  createdAt: string;
  updatedAt: string;
}

// Monthly Deductible Fine record - stores monthly aggregated fine data
export interface MonthlyDeductibleFine {
  id: string;
  employeeId: string;
  employeeName?: string; // Populated on read
  month: number; // 1-12
  year: number;
  actualAmount: number; // Sum of all actual fines for the month
  deductibleAmount: number; // Calculated amount (actualAmount * multiplier)
  finalDeductibleAmount: number; // Final amount after manual edits
  multiplier: number; // 1 or 2 - the multiplier used for calculation
  createdAt: string;
  updatedAt: string;
}

// Incentive record
export interface Incentive {
  id: string;
  employeeId: string;
  month: number; // 1-12
  year: number;
  type: 'punctuality' | 'performance' | 'bonus' | 'other';
  amount: number;
  description: string;
  awardedBy: string;
  createdAt: string;
}

// Notification
export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'leave_request'
  | 'leave_approved'
  | 'leave_rejected'
  | 'fine_approved'
  | 'fine_waived'
  | 'incentive_awarded'
  | 'attendance_alert';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// Audit Log Action Types
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN'
  | 'EXPORT'
  | 'SYNC'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'WAIVE'
  | 'SUBMIT'
  | 'BULK_CREATE'
  | 'BULK_UPDATE'
  | 'BULK_DELETE';

// Audit Log Entity Types
export type AuditEntityType =
  | 'user'
  | 'employee'
  | 'attendance'
  | 'leave'
  | 'fine'
  | 'incentive'
  | 'settings'
  | 'department'
  | 'biometric'
  | 'export'
  | 'leave_balance'
  | 'notification'
  | 'evaluation'
  | 'document';

// Audit Log
export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  description: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  context: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// System Settings
export interface SystemSettings {
  officeStartTime: string; // HH:MM format
  officeEndTime: string;
  graceMinutes: number;
  fineRules: FineRule[];
  leaveQuotas: LeaveQuota[];
  punctualityMaxLates: number;
  minAttendancePercentage: number;
  punctualityIncentiveAmount: number;
}

// Fine Rule
export interface FineRule {
  minMinutes: number;
  maxMinutes: number | null;
  amount: number;
}

// Leave Quota
export interface LeaveQuota {
  leaveType: LeaveType;
  annualDays: number;
}

// Department
export interface Department {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  parentDepartmentId?: string | null;
  parentDepartment?: {
    id: string;
    name: string;
  } | null;
  childDepartmentsCount?: number;
  _count?: {
    employees: number;
  };
  managerId?: string;
  createdAt: string;
  updatedAt?: string;
}

// Employee Evaluation
export interface EmployeeEvaluation {
  id: string;
  employeeId: string;
  evaluationType: EvaluationType;
  name: string;
  totalMarks?: number | null;
  obtainedMarks?: number | null;
  status: EvaluationStatus;
  notes?: string | null;
  wasRetaken: boolean;
  evaluationDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

