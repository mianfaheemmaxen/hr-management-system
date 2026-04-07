/**
 * Biometric Sync Service
 * 
 * Handles synchronization between biometric system and HR portal
 */

import prisma from "@/lib/prisma";
import { biometricService } from "./biometric-service";
import { format, getDay } from "date-fns";
import { calculateLateMinutes, determineAttendanceStatus, calculateFineAmount } from "@/lib/attendance-utils";

export class BiometricSyncService {
  /**
   * Sync employees from biometric system
   * This should run every 1 hour
   */
  async syncEmployees(): Promise<{ success: boolean; synced: number; errors: string[] }> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      console.log('[Biometric Sync] Starting employee sync...');
      
      // Fetch all employees from biometric system
      const biometricEmployees = await biometricService.fetchAllEmployees();
      console.log(`[Biometric Sync] Fetched ${biometricEmployees.length} employees from biometric system`);

      // For each biometric employee, check if we have a matching employee in our system
      for (const bioEmployee of biometricEmployees) {
        try {
          // Check if employee with this biometric ID already exists
          const existingEmployee = await prisma.employee.findUnique({
            where: { biometricId: bioEmployee.id.toString() }
          });

          if (existingEmployee) {
            // Employee already linked, skip
            syncedCount++;
          } else {
            // Log unlinked biometric employee for manual linking
            console.log(`[Biometric Sync] Unlinked biometric employee: ID=${bioEmployee.id}, Code=${bioEmployee.emp_code}, Name=${bioEmployee.full_name}`);
          }
        } catch (error) {
          const errorMsg = `Error processing biometric employee ${bioEmployee.id}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`[Biometric Sync] Employee sync completed. Synced: ${syncedCount}, Errors: ${errors.length}`);
      
      return {
        success: errors.length === 0,
        synced: syncedCount,
        errors
      };
    } catch (error) {
      const errorMsg = `Fatal error during employee sync: ${error}`;
      console.error(errorMsg);
      return {
        success: false,
        synced: syncedCount,
        errors: [errorMsg]
      };
    }
  }

  /**
   * Sync attendance from biometric system using firstInLastOutReport API
   * This should run every 5 minutes
   */
  async syncAttendance(date?: Date): Promise<{ success: boolean; synced: number; errors: string[] }> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      const targetDate = date || new Date();
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      console.log(`[Biometric Sync] Starting attendance sync for ${dateStr}...`);

      // Get all active employees (both with and without biometric IDs)
      const employees = await prisma.employee.findMany({
        where: {
          status: 'active'
        },
        select: {
          id: true,
          biometricId: true,
          employeeCode: true
        }
      });

      if (employees.length === 0) {
        console.log('[Biometric Sync] No active employees found');
        return { success: true, synced: 0, errors: [] };
      }

      // Separate employees with and without biometric IDs
      const employeesWithBiometric = employees.filter(emp => emp.biometricId);
      const employeesWithoutBiometric = employees.filter(emp => !emp.biometricId);

      // Create a map of biometricId (emp_code) to employee for quick lookup
      const employeeByBiometricId = new Map(
        employeesWithBiometric.map(emp => [emp.biometricId, emp])
      );

      console.log(`[Biometric Sync] Total employees: ${employees.length} (With biometric: ${employeesWithBiometric.length}, Without: ${employeesWithoutBiometric.length})`);

      // Fetch attendance using the new firstInLastOutReport API
      const attendanceRecords = await biometricService.fetchAllDailyAttendance(dateStr);

      console.log(`[Biometric Sync] Fetched ${attendanceRecords.length} attendance records from biometric`);

      // Get system settings for office times and grace period
      const settings = await prisma.systemSettings.findUnique({
        where: { id: 'default' }
      });

      if (!settings) {
        throw new Error('System settings not found');
      }

      // Parse daily timings if available
      let dailyTimings = null;
      try {
        dailyTimings = settings.dailyTimings ? JSON.parse(settings.dailyTimings) : null;
      } catch (e) {
        console.error('[Biometric Sync] Error parsing dailyTimings:', e);
      }

      // Process each attendance record
      for (const bioRecord of attendanceRecords) {
        try {
          // Find employee by biometric ID (emp_code) - using the map for O(1) lookup
          const employee = employeeByBiometricId.get(bioRecord.emp_code);

          if (!employee) {
            // Skip - this employee is not linked in our system
            continue;
          }

          // Parse attendance data from the new API (check_in/check_out are already in HH:mm format)
          const checkIn = bioRecord.check_in || null;
          const checkOut = bioRecord.check_out || null;

          // Get the office start time for this specific day
          const attendanceDate = new Date(bioRecord.att_date);
          const dayOfWeek = getDay(attendanceDate); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = dayNames[dayOfWeek];

          // Get office start time from daily timings - default to 09:00 if not set
          let officeStartTime = '09:00';
          let isOffDay = false;

          if (dailyTimings && dailyTimings[dayName]) {
            const dayTiming = dailyTimings[dayName];
            isOffDay = dayTiming.isOffDay || false;
            if (!dayTiming.isOffDay && dayTiming.startTime) {
              officeStartTime = dayTiming.startTime;
            }
          }

          // Calculate late minutes and determine status using our utility functions
          let lateMinutes = 0;
          let status = 'on_time';

          if (!checkIn && !checkOut) {
            status = 'absent';
          } else if (checkIn) {
            // If it's an off-day but employee came, mark as on_time (no late calculation)
            if (isOffDay) {
              status = 'on_time';
              lateMinutes = 0;
            } else {
              // Use our attendance utility functions for proper calculation
              lateMinutes = calculateLateMinutes(
                checkIn,
                officeStartTime,
                settings.graceMinutes
              );

              status = determineAttendanceStatus(
                checkIn,
                checkOut ?? undefined,  // Convert null to undefined for type compatibility
                officeStartTime,
                settings.graceMinutes
              );
            }
          }

          console.log(`[Biometric Sync] Employee ${bioRecord.emp_code}: Date=${bioRecord.att_date}, Day=${dayName}${isOffDay ? ' (OFF-DAY)' : ''}, CheckIn=${checkIn}, OfficeStart=${officeStartTime}, Grace=${settings.graceMinutes}min, LateMinutes=${lateMinutes}, Status=${status}`);

          // Upsert attendance record
          const attendanceRecord = await prisma.attendanceRecord.upsert({
            where: {
              employeeId_date: {
                employeeId: employee.id,
                date: new Date(bioRecord.att_date)
              }
            },
            update: {
              checkIn,
              checkOut,
              status,
              lateMinutes,
              source: 'biometric',
              updatedAt: new Date()
            },
            create: {
              employeeId: employee.id,
              date: new Date(bioRecord.att_date),
              checkIn,
              checkOut,
              status,
              lateMinutes,
              isCompensated: false,
              source: 'biometric'
            }
          });

          // Auto-create fine if late and not compensated
          if (status === 'late' && lateMinutes > 0 && !attendanceRecord.isCompensated) {
            try {
              let fineRules = [];
              if (settings.fineRules) {
                try {
                  fineRules = typeof settings.fineRules === 'string'
                    ? JSON.parse(settings.fineRules)
                    : settings.fineRules;
                } catch (parseError) {
                  console.error('[Biometric Sync] Error parsing fineRules:', parseError);
                }
              }

              console.log(`[Biometric Sync] Fine calculation for ${bioRecord.emp_code}: ${lateMinutes} min late, Rules:`, JSON.stringify(fineRules));

              // Calculate fine amount
              const fineAmount = calculateFineAmount(lateMinutes, fineRules);
              console.log(`[Biometric Sync] Calculated fine amount for ${bioRecord.emp_code}: Rs.${fineAmount}`);

              if (fineAmount > 0) {
                // Check if this qualifies for the 5-minute grace period (first 3 times per month)
                let shouldAutoWaive = false;
                let graceCount = 0;

                if (lateMinutes > 0 && lateMinutes <= 5) {
                  // Get the current month's start and end dates
                  const currentDate = new Date(bioRecord.att_date);
                  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

                  // Count how many times this employee was late within 5 minutes this month (excluding today)
                  const lateWithin5MinCount = await prisma.attendanceRecord.count({
                    where: {
                      employeeId: employee.id,
                      date: {
                        gte: monthStart,
                        lte: monthEnd,
                        not: new Date(bioRecord.att_date) // Exclude today
                      },
                      status: 'late',
                      lateMinutes: {
                        gt: 0,
                        lte: 5
                      }
                    }
                  });

                  // If this is one of the first 3 times, auto-waive the fine
                  if (lateWithin5MinCount < 3) {
                    shouldAutoWaive = true;
                    graceCount = lateWithin5MinCount + 1;
                    console.log(`[Biometric Sync] 🎁 Grace period will be applied for ${bioRecord.emp_code}: ${graceCount}/3 times late within 5 min this month`);
                  } else {
                    console.log(`[Biometric Sync] ⚠️ Grace period exhausted for ${bioRecord.emp_code}: Already late within 5 min ${lateWithin5MinCount} times this month`);
                  }
                }

                // Check if fine already exists
                const existingFine = await prisma.fine.findFirst({
                  where: {
                    employeeId: employee.id,
                    date: new Date(bioRecord.att_date),
                    type: 'late_arrival'
                  }
                });

                if (!existingFine) {
                  // Create fine with appropriate status and waiver reason
                  const fineData: any = {
                    employeeId: employee.id,
                    date: new Date(bioRecord.att_date),
                    type: 'late_arrival',
                    lateMinutes,
                    reason: `Late arrival by ${lateMinutes} minutes`,
                    amount: fineAmount,
                    status: shouldAutoWaive ? 'waived' : 'implemented'
                  };

                  // Add waiver reason if auto-waiving
                  if (shouldAutoWaive) {
                    fineData.waiverReason = `Grace period - late within 5 minutes (${graceCount} of 3 monthly allowance)`;
                  }

                  await prisma.fine.create({ data: fineData });

                  if (shouldAutoWaive) {
                    console.log(`[Biometric Sync] ✅ Created WAIVED fine for ${bioRecord.emp_code}: Rs.${fineAmount} (${lateMinutes} min late) - Grace period ${graceCount}/3`);
                  } else {
                    console.log(`[Biometric Sync] ✅ Created fine for ${bioRecord.emp_code}: Rs.${fineAmount} (${lateMinutes} min late)`);
                  }
                } else {
                  console.log(`[Biometric Sync] ⚠️ Fine already exists for ${bioRecord.emp_code} on ${bioRecord.att_date}`);
                }
              } else {
                console.log(`[Biometric Sync] ⚠️ No fine created for ${bioRecord.emp_code}: Fine amount is 0 (${lateMinutes} min late)`);
              }
            } catch (fineError) {
              console.error(`[Biometric Sync] ❌ Error creating fine for ${bioRecord.emp_code}:`, fineError);
              // Don't fail the whole sync if fine creation fails
            }
          } else {
            // Log why fine was not created
            if (status !== 'late') {
              console.log(`[Biometric Sync] No fine for ${bioRecord.emp_code}: Status is '${status}' (not late)`);
            } else if (lateMinutes <= 0) {
              console.log(`[Biometric Sync] No fine for ${bioRecord.emp_code}: Late minutes is ${lateMinutes}`);
            } else if (attendanceRecord.isCompensated) {
              console.log(`[Biometric Sync] No fine for ${bioRecord.emp_code}: Attendance is compensated`);
            }
          }

          syncedCount++;
        } catch (error) {
          const errorMsg = `Error processing attendance for ${bioRecord.emp_code}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Track employees who had biometric attendance
      const employeesWithAttendance = new Set(
        attendanceRecords
          .map(record => employeeByBiometricId.get(record.emp_code)?.id)
          .filter(Boolean)
      );

      // Process employees without biometric attendance
      console.log(`[Biometric Sync] Processing employees without biometric attendance...`);

      for (const employee of employeesWithoutBiometric) {
        try {
          // Check if employee is on approved leave for this date
          const approvedLeave = await prisma.leaveRequest.findFirst({
            where: {
              employeeId: employee.id,
              status: 'approved',
              startDate: { lte: new Date(dateStr) },
              endDate: { gte: new Date(dateStr) }
            }
          });

          if (approvedLeave) {
            // Mark as on leave
            await prisma.attendanceRecord.upsert({
              where: {
                employeeId_date: {
                  employeeId: employee.id,
                  date: new Date(dateStr)
                }
              },
              update: {
                status: 'leave',
                checkIn: null,
                checkOut: null,
                lateMinutes: 0,
                source: 'auto',
                updatedAt: new Date()
              },
              create: {
                employeeId: employee.id,
                date: new Date(dateStr),
                status: 'leave',
                checkIn: null,
                checkOut: null,
                lateMinutes: 0,
                isCompensated: false,
                source: 'auto'
              }
            });
            console.log(`[Biometric Sync] Employee ${employee.employeeCode} marked as on leave`);
          } else {
            // Mark as absent
            await prisma.attendanceRecord.upsert({
              where: {
                employeeId_date: {
                  employeeId: employee.id,
                  date: new Date(dateStr)
                }
              },
              update: {
                status: 'absent',
                checkIn: null,
                checkOut: null,
                lateMinutes: 0,
                source: 'auto',
                updatedAt: new Date()
              },
              create: {
                employeeId: employee.id,
                date: new Date(dateStr),
                status: 'absent',
                checkIn: null,
                checkOut: null,
                lateMinutes: 0,
                isCompensated: false,
                source: 'auto'
              }
            });
            console.log(`[Biometric Sync] Employee ${employee.employeeCode} marked as absent (no biometric data)`);
          }
          syncedCount++;
        } catch (error) {
          const errorMsg = `Error processing employee without biometric ${employee.employeeCode}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Also check employees WITH biometric who didn't have attendance today
      for (const employee of employeesWithBiometric) {
        if (!employeesWithAttendance.has(employee.id)) {
          try {
            // Check if employee is on approved leave for this date
            const approvedLeave = await prisma.leaveRequest.findFirst({
              where: {
                employeeId: employee.id,
                status: 'approved',
                startDate: { lte: new Date(dateStr) },
                endDate: { gte: new Date(dateStr) }
              }
            });

            if (approvedLeave) {
              // Mark as on leave
              await prisma.attendanceRecord.upsert({
                where: {
                  employeeId_date: {
                    employeeId: employee.id,
                    date: new Date(dateStr)
                  }
                },
                update: {
                  status: 'leave',
                  checkIn: null,
                  checkOut: null,
                  lateMinutes: 0,
                  source: 'auto',
                  updatedAt: new Date()
                },
                create: {
                  employeeId: employee.id,
                  date: new Date(dateStr),
                  status: 'leave',
                  checkIn: null,
                  checkOut: null,
                  lateMinutes: 0,
                  isCompensated: false,
                  source: 'auto'
                }
              });
              console.log(`[Biometric Sync] Employee ${employee.employeeCode} marked as on leave`);
            } else {
              // Mark as absent
              await prisma.attendanceRecord.upsert({
                where: {
                  employeeId_date: {
                    employeeId: employee.id,
                    date: new Date(dateStr)
                  }
                },
                update: {
                  status: 'absent',
                  checkIn: null,
                  checkOut: null,
                  lateMinutes: 0,
                  source: 'auto',
                  updatedAt: new Date()
                },
                create: {
                  employeeId: employee.id,
                  date: new Date(dateStr),
                  status: 'absent',
                  checkIn: null,
                  checkOut: null,
                  lateMinutes: 0,
                  isCompensated: false,
                  source: 'auto'
                }
              });
              console.log(`[Biometric Sync] Employee ${employee.employeeCode} marked as absent (no attendance today)`);
            }
            syncedCount++;
          } catch (error) {
            const errorMsg = `Error processing absent employee ${employee.employeeCode}: ${error}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      console.log(`[Biometric Sync] Attendance sync completed. Synced: ${syncedCount}, Errors: ${errors.length}`);

      return {
        success: errors.length === 0,
        synced: syncedCount,
        errors
      };
    } catch (error) {
      const errorMsg = `Fatal error during attendance sync: ${error}`;
      console.error(errorMsg);
      return {
        success: false,
        synced: syncedCount,
        errors: [errorMsg]
      };
    }
  }
}

export const biometricSyncService = new BiometricSyncService();

