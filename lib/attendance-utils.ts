import { AttendanceRecord, AttendanceStatus, FineRule, SystemSettings } from './types';
import { format, parse, differenceInMinutes, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';

/**
 * Calculate late minutes based on check-in time and office start time
 */
export function calculateLateMinutes(
  checkInTime: string,
  officeStartTime: string,
  graceMinutes: number
): number {
  // Return 0 if either time is missing
  if (!checkInTime || !officeStartTime) {
    return 0;
  }

  const checkIn = parse(checkInTime, 'HH:mm', new Date());
  const officeStart = parse(officeStartTime, 'HH:mm', new Date());

  const diffMinutes = differenceInMinutes(checkIn, officeStart);

  // If within grace period, no late minutes
  if (diffMinutes <= graceMinutes) {
    return 0;
  }

  return diffMinutes;
}

/**
 * Determine attendance status based on check-in time
 * Priority: First check on_time/late based on check-in, then check half_day at end of day
 */
export function determineAttendanceStatus(
  checkInTime: string | undefined,
  checkOutTime: string | undefined,
  officeStartTime: string,
  graceMinutes: number,
  minWorkHours: number = 4,
  checkHalfDay: boolean = false // Only check half_day at end of day
): AttendanceStatus {
  if (!checkInTime) {
    return 'absent';
  }

  // First, determine if employee was on_time or late based on check-in time
  const lateMinutes = calculateLateMinutes(checkInTime, officeStartTime, graceMinutes);

  let status: AttendanceStatus;
  if (lateMinutes === 0) {
    status = 'on_time';
  } else {
    status = 'late';
  }

  // Only check for half_day if explicitly requested (at end of day)
  // This is because employees go in and out multiple times during the day
  if (checkHalfDay && checkInTime && checkOutTime) {
    const checkIn = parse(checkInTime, 'HH:mm', new Date());
    const checkOut = parse(checkOutTime, 'HH:mm', new Date());
    const workedMinutes = differenceInMinutes(checkOut, checkIn);
    const workedHours = workedMinutes / 60;

    if (workedHours < minWorkHours) {
      return 'half_day';
    }
  }

  return status;
}

/**
 * Calculate fine amount based on late minutes and fine rules
 */
export function calculateFineAmount(lateMinutes: number, fineRules: FineRule[]): number {
  if (lateMinutes <= 0) return 0;

  // If no fine rules, return 0
  if (!fineRules || fineRules.length === 0) {
    console.warn('[Fine Calculation] No fine rules configured');
    return 0;
  }

  // Sort rules by minMinutes (ascending)
  const sortedRules = [...fineRules].sort((a, b) => a.minMinutes - b.minMinutes);

  // Find the applicable rule
  let applicableRule = null;
  for (const rule of sortedRules) {
    if (rule.maxMinutes === null || rule.maxMinutes === undefined) {
      // This is a rule with no upper bound
      if (lateMinutes >= rule.minMinutes) {
        applicableRule = rule;
        break; // Found the rule, no need to continue
      }
    } else if (lateMinutes >= rule.minMinutes && lateMinutes <= rule.maxMinutes) {
      applicableRule = rule;
      break; // Found the rule, no need to continue
    }
  }

  if (applicableRule) {
    console.log(`[Fine Calculation] ${lateMinutes} min late -> Rs.${applicableRule.amount} (Rule: ${applicableRule.minMinutes}-${applicableRule.maxMinutes || '∞'})`);
    return applicableRule.amount;
  }

  console.warn(`[Fine Calculation] No matching rule for ${lateMinutes} minutes late. Rules:`, sortedRules);
  return 0;
}

/**
 * Get working days in a month (excluding weekends)
 */
export function getWorkingDaysInMonth(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  
  const allDays = eachDayOfInterval({ start, end });
  return allDays.filter(day => !isWeekend(day));
}

/**
 * Calculate attendance statistics for an employee in a date range
 */
export function calculateAttendanceStats(records: AttendanceRecord[]) {
  const stats = {
    totalDays: records.length,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    onTimeDays: 0,
    totalLateMinutes: 0,
    compensatedLates: 0,
    uncompensatedLates: 0,
  };
  
  for (const record of records) {
    switch (record.status) {
      case 'on_time':
        stats.presentDays++;
        stats.onTimeDays++;
        break;
      case 'late':
        stats.presentDays++;
        stats.lateDays++;
        stats.totalLateMinutes += record.lateMinutes;
        if (record.isCompensated) {
          stats.compensatedLates++;
        } else {
          stats.uncompensatedLates++;
        }
        break;
      case 'absent':
        stats.absentDays++;
        break;
      case 'half_day':
        stats.halfDays++;
        break;
      case 'leave':
        stats.leaveDays++;
        break;
    }
  }
  
  return stats;
}

/**
 * Check if an employee is eligible for punctuality incentive
 */
export function checkPunctualityEligibility(
  records: AttendanceRecord[],
  settings: SystemSettings
): { eligible: boolean; reason: string } {
  const stats = calculateAttendanceStats(records);
  
  // Any uncompensated late disqualifies
  if (stats.uncompensatedLates > settings.punctualityMaxLates) {
    return {
      eligible: false,
      reason: `Has ${stats.uncompensatedLates} uncompensated late arrival(s). Maximum allowed: ${settings.punctualityMaxLates}`,
    };
  }
  
  // Check attendance percentage
  const totalWorkingDays = stats.presentDays + stats.absentDays + stats.halfDays;
  if (totalWorkingDays > 0) {
    const attendancePercentage = ((stats.presentDays + stats.leaveDays) / totalWorkingDays) * 100;
    if (attendancePercentage < settings.minAttendancePercentage) {
      return {
        eligible: false,
        reason: `Attendance percentage ${attendancePercentage.toFixed(1)}% is below minimum ${settings.minAttendancePercentage}%`,
      };
    }
  }
  
  return {
    eligible: true,
    reason: 'Meets all punctuality criteria',
  };
}

/**
 * Format time for display (HH:MM)
 */
export function formatTime(time: string): string {
  return time;
}

/**
 * Finalize attendance status at end of day
 * This should be called at the end of the day to check for half_day status
 * based on total worked hours
 */
export function finalizeAttendanceStatus(
  checkInTime: string | undefined,
  checkOutTime: string | undefined,
  officeStartTime: string,
  graceMinutes: number,
  minWorkHours: number = 4
): AttendanceStatus {
  return determineAttendanceStatus(
    checkInTime,
    checkOutTime,
    officeStartTime,
    graceMinutes,
    minWorkHours,
    true // Check half_day at end of day
  );
}

/**
 * Parse Excel time value to HH:MM format
 */
export function parseExcelTime(value: number | string): string {
  if (typeof value === 'string') {
    // Already in time format
    return value;
  }
  
  // Excel stores times as fractions of a day
  const totalMinutes = Math.round(value * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Generate attendance summary for a day
 */
export function generateDailySummary(records: AttendanceRecord[]) {
  return {
    total: records.length,
    present: records.filter(r => r.status === 'on_time' || r.status === 'late').length,
    onTime: records.filter(r => r.status === 'on_time').length,
    late: records.filter(r => r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
    halfDay: records.filter(r => r.status === 'half_day').length,
    leave: records.filter(r => r.status === 'leave').length,
  };
}

/**
 * Get office start time for a specific date from daily timings
 * Falls back to default if daily timings not configured
 */
export function getOfficeStartTimeForDate(
  date: string | Date,
  dailyTimings: any,
  defaultStartTime: string = '09:00'
): string {
  const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];

  if (dailyTimings && dailyTimings[dayName]) {
    const dayTiming = dailyTimings[dayName];
    if (!dayTiming.isOffDay && dayTiming.startTime) {
      return dayTiming.startTime;
    }
  }

  return defaultStartTime;
}

/**
 * Check if a date is an off day according to daily timings
 */
export function isOffDay(
  date: string | Date,
  dailyTimings: any
): boolean {
  const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const dayOfWeek = dateObj.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];

  if (dailyTimings && dailyTimings[dayName]) {
    return dailyTimings[dayName].isOffDay || false;
  }

  return false;
}

