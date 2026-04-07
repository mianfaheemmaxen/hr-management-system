import prisma from "@/lib/prisma";
import { AuditAction, AuditEntityType } from "@/lib/types";
import { headers } from "next/headers";

export interface AuditLogParams {
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  description?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Extract IP address and User Agent from request headers
 */
export async function getRequestInfo(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : headersList.get("x-real-ip");
    const userAgent = headersList.get("user-agent");
    return { ipAddress, userAgent };
  } catch {
    // Headers not available (e.g., in non-request context)
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    // Get request info if not provided
    let ipAddress = params.ipAddress;
    let userAgent = params.userAgent;

    if (!ipAddress || !userAgent) {
      const requestInfo = await getRequestInfo();
      ipAddress = ipAddress || requestInfo.ipAddress;
      userAgent = userAgent || requestInfo.userAgent;
    }

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userName: params.userName || null,
        userEmail: params.userEmail || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        description: params.description || null,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        context: params.context ? JSON.stringify(params.context) : null,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Helper to generate description based on action and entity
 */
export function generateDescription(
  action: AuditAction,
  entityType: AuditEntityType,
  entityName?: string
): string {
  const actionDescriptions: Record<AuditAction, string> = {
    CREATE: "created",
    UPDATE: "updated",
    DELETE: "deleted",
    LOGIN: "logged in",
    LOGOUT: "logged out",
    FAILED_LOGIN: "failed login attempt",
    EXPORT: "exported",
    SYNC: "synchronized",
    APPROVE: "approved",
    REJECT: "rejected",
    CANCEL: "cancelled",
    WAIVE: "waived",
    SUBMIT: "submitted",
    BULK_CREATE: "bulk created",
    BULK_UPDATE: "bulk updated",
    BULK_DELETE: "bulk deleted",
  };

  const entityDescriptions: Record<AuditEntityType, string> = {
    user: "user",
    employee: "employee",
    attendance: "attendance record",
    leave: "leave request",
    fine: "fine",
    incentive: "incentive",
    settings: "system settings",
    department: "department",
    biometric: "biometric data",
    export: "data export",
    leave_balance: "leave balance",
    notification: "notification",
    evaluation: "evaluation",
    document: "document",
  };

  const actionText = actionDescriptions[action] || action.toLowerCase();
  const entityText = entityDescriptions[entityType] || entityType;

  if (entityName) {
    return `${actionText} ${entityText}: ${entityName}`;
  }
  return `${actionText} ${entityText}`;
}

/**
 * Helper to extract changed fields between old and new values
 */
export function getChangedFields(
  oldValue: Record<string, unknown> | null | undefined,
  newValue: Record<string, unknown> | null | undefined
): { field: string; old: unknown; new: unknown }[] {
  if (!oldValue || !newValue) return [];

  const changes: { field: string; old: unknown; new: unknown }[] = [];
  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

  for (const key of allKeys) {
    const oldVal = oldValue[key];
    const newVal = newValue[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, old: oldVal, new: newVal });
    }
  }

  return changes;
}

/**
 * Log authentication events
 */
export async function logAuthEvent(params: {
  action: "LOGIN" | "LOGOUT" | "FAILED_LOGIN";
  userId?: string | null;
  userEmail: string;
  userName?: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "user",
    entityId: params.userId,
    description: generateDescription(params.action, "user", params.userEmail),
    context: params.context,
  });
}

/**
 * Log employee management events
 */
export async function logEmployeeEvent(params: {
  action: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  employeeId: string;
  employeeName?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "employee",
    entityId: params.employeeId,
    description: generateDescription(params.action, "employee", params.employeeName),
    oldValue: params.oldValue,
    newValue: params.newValue,
    context: params.context,
  });
}

/**
 * Log attendance events
 */
export async function logAttendanceEvent(params: {
  action: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  attendanceId?: string | null;
  employeeName?: string;
  date?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  const desc = params.employeeName && params.date
    ? `${generateDescription(params.action, "attendance")} for ${params.employeeName} on ${params.date}`
    : generateDescription(params.action, "attendance");

  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "attendance",
    entityId: params.attendanceId,
    description: desc,
    oldValue: params.oldValue,
    newValue: params.newValue,
    context: params.context,
  });
}

/**
 * Log leave request events
 */
export async function logLeaveEvent(params: {
  action: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  leaveId: string;
  employeeName?: string;
  leaveType?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  const desc = params.employeeName && params.leaveType
    ? `${generateDescription(params.action, "leave")} - ${params.leaveType} leave for ${params.employeeName}`
    : generateDescription(params.action, "leave");

  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "leave",
    entityId: params.leaveId,
    description: desc,
    oldValue: params.oldValue,
    newValue: params.newValue,
    context: params.context,
  });
}

/**
 * Log fine events
 */
export async function logFineEvent(params: {
  action: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  fineId: string;
  employeeName?: string;
  amount?: number;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  const desc = params.employeeName && params.amount !== undefined
    ? `${generateDescription(params.action, "fine")} - Rs. ${params.amount} for ${params.employeeName}`
    : generateDescription(params.action, "fine");

  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "fine",
    entityId: params.fineId,
    description: desc,
    oldValue: params.oldValue,
    newValue: params.newValue,
    context: params.context,
  });
}

/**
 * Log incentive events
 */
export async function logIncentiveEvent(params: {
  action: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  incentiveId: string;
  employeeName?: string;
  amount?: number;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  const desc = params.employeeName && params.amount !== undefined
    ? `${generateDescription(params.action, "incentive")} - Rs. ${params.amount} for ${params.employeeName}`
    : generateDescription(params.action, "incentive");

  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "incentive",
    entityId: params.incentiveId,
    description: desc,
    oldValue: params.oldValue,
    newValue: params.newValue,
    context: params.context,
  });
}

/**
 * Log system settings events
 */
export async function logSettingsEvent(params: {
  userId: string;
  userName: string;
  userEmail: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: "UPDATE",
    entityType: "settings",
    entityId: "system",
    description: "updated system settings",
    oldValue: params.oldValue,
    newValue: params.newValue,
    context: params.context,
  });
}

/**
 * Log department events
 */
export async function logDepartmentEvent(params: {
  action: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  departmentId: string;
  departmentName?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "department",
    entityId: params.departmentId,
    description: generateDescription(params.action, "department", params.departmentName),
    oldValue: params.oldValue,
    newValue: params.newValue,
    context: params.context,
  });
}

/**
 * Log biometric sync events
 */
export async function logBiometricEvent(params: {
  action: "SYNC";
  userId: string;
  userName: string;
  userEmail: string;
  syncType: "employees" | "attendance";
  context?: Record<string, unknown>;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "biometric",
    entityId: null,
    description: `synchronized biometric ${params.syncType}`,
    context: params.context,
  });
}

/**
 * Log export events
 */
export async function logExportEvent(params: {
  userId: string;
  userName: string;
  userEmail: string;
  exportType: "CSV" | "Excel" | "PDF";
  entityType: AuditEntityType;
  context?: Record<string, unknown>;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: "EXPORT",
    entityType: "export",
    entityId: null,
    description: `exported ${params.entityType} data to ${params.exportType}`,
    context: params.context,
  });
}

/**
 * Log notification events
 */
export async function logNotificationEvent(params: {
  action: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  notificationId?: string | null;
  recipientName?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  const desc = params.recipientName
    ? `${generateDescription(params.action, "notification")} for ${params.recipientName}`
    : generateDescription(params.action, "notification");

  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "notification",
    entityId: params.notificationId,
    description: desc,
    oldValue: params.oldValue,
    newValue: params.newValue,
    context: params.context,
  });
}

/**
 * Log document events
 */
export async function logDocumentEvent(params: {
  action: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  documentId: string;
  documentName?: string;
  employeeName?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  const desc = params.employeeName && params.documentName
    ? `${generateDescription(params.action, "document")} - ${params.documentName} for ${params.employeeName}`
    : generateDescription(params.action, "document", params.documentName);

  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "document",
    entityId: params.documentId,
    description: desc,
    oldValue: params.oldValue,
    newValue: params.newValue,
    context: params.context,
  });
}

/**
 * Log leave balance events
 */
export async function logLeaveBalanceEvent(params: {
  action: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  leaveBalanceId?: string | null;
  employeeName?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  const desc = params.employeeName
    ? `${generateDescription(params.action, "leave_balance")} for ${params.employeeName}`
    : generateDescription(params.action, "leave_balance");

  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    action: params.action,
    entityType: "leave_balance",
    entityId: params.leaveBalanceId,
    description: desc,
    oldValue: params.oldValue,
    newValue: params.newValue,
    context: params.context,
  });
}
