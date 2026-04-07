/**
 * Biometric Sync Scheduler
 * 
 * Automatically syncs employee and attendance data from biometric system
 * - Employee Sync: Every 1 hour
 * - Attendance Sync: Every 5 minutes
 */

import * as cron from 'node-cron';
import { biometricSyncService } from './sync-service';

let isSchedulerRunning = false;
let employeeSyncTask: cron.ScheduledTask | null = null;
let attendanceSyncTask: cron.ScheduledTask | null = null;

/**
 * Start the biometric sync scheduler
 */
export function startBiometricScheduler() {
  if (isSchedulerRunning) {
    console.log('[Scheduler] Biometric scheduler is already running');
    return;
  }

  console.log('[Scheduler] Starting biometric sync scheduler...');

  // Employee sync - every 1 hour (at minute 0 of every hour)
  // Cron format: minute hour day month weekday
  // '0 * * * *' = At minute 0 of every hour
  employeeSyncTask = cron.schedule('0 * * * *', async () => {
    const now = new Date().toISOString();
    console.log(`\n[Scheduler] ${now} - Running employee sync...`);
    
    try {
      const result = await biometricSyncService.syncEmployees();
      
      if (result.success) {
        console.log(`[Scheduler] ✅ Employee sync completed: ${result.synced} employees synced`);
      } else {
        console.log(`[Scheduler] ⚠️ Employee sync completed with errors: ${result.synced} synced, ${result.errors.length} errors`);
        result.errors.forEach(error => console.error(`[Scheduler]   - ${error}`));
      }
    } catch (error) {
      console.error('[Scheduler] ❌ Employee sync failed:', error);
    }
  }, {
    timezone: "Asia/Karachi" // Adjust to your timezone
  });

  // Attendance sync - every 5 minutes
  // '*/5 * * * *' = Every 5 minutes
  attendanceSyncTask = cron.schedule('*/5 * * * *', async () => {
    const now = new Date().toISOString();
    console.log(`\n[Scheduler] ${now} - Running attendance sync...`);
    
    try {
      const result = await biometricSyncService.syncAttendance();
      
      if (result.success) {
        console.log(`[Scheduler] ✅ Attendance sync completed: ${result.synced} records synced`);
      } else {
        console.log(`[Scheduler] ⚠️ Attendance sync completed with errors: ${result.synced} synced, ${result.errors.length} errors`);
        result.errors.forEach(error => console.error(`[Scheduler]   - ${error}`));
      }
    } catch (error) {
      console.error('[Scheduler] ❌ Attendance sync failed:', error);
    }
  }, {
    timezone: "Asia/Karachi" // Adjust to your timezone
  });

  isSchedulerRunning = true;
  
  console.log('[Scheduler] ✅ Biometric sync scheduler started successfully');
  console.log('[Scheduler] 📅 Employee sync: Every 1 hour (at minute 0)');
  console.log('[Scheduler] 📅 Attendance sync: Every 5 minutes');
  console.log('[Scheduler] 🌍 Timezone: Asia/Karachi');
}

/**
 * Stop the biometric sync scheduler
 */
export function stopBiometricScheduler() {
  if (!isSchedulerRunning) {
    console.log('[Scheduler] Biometric scheduler is not running');
    return;
  }

  console.log('[Scheduler] Stopping biometric sync scheduler...');

  if (employeeSyncTask) {
    employeeSyncTask.stop();
    employeeSyncTask = null;
  }

  if (attendanceSyncTask) {
    attendanceSyncTask.stop();
    attendanceSyncTask = null;
  }

  isSchedulerRunning = false;
  console.log('[Scheduler] ✅ Biometric sync scheduler stopped');
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    isRunning: isSchedulerRunning,
    employeeSyncSchedule: '0 * * * * (Every 1 hour)',
    attendanceSyncSchedule: '*/5 * * * * (Every 5 minutes)',
    timezone: 'Asia/Karachi',
  };
}

/**
 * Run employee sync immediately (manual trigger)
 */
export async function runEmployeeSyncNow() {
  console.log('[Scheduler] Manual employee sync triggered');
  try {
    const result = await biometricSyncService.syncEmployees();
    console.log(`[Scheduler] Manual employee sync completed: ${result.synced} synced, ${result.errors.length} errors`);
    return result;
  } catch (error) {
    console.error('[Scheduler] Manual employee sync failed:', error);
    throw error;
  }
}

/**
 * Run attendance sync immediately (manual trigger)
 */
export async function runAttendanceSyncNow() {
  console.log('[Scheduler] Manual attendance sync triggered');
  try {
    const result = await biometricSyncService.syncAttendance();
    console.log(`[Scheduler] Manual attendance sync completed: ${result.synced} synced, ${result.errors.length} errors`);
    return result;
  } catch (error) {
    console.error('[Scheduler] Manual attendance sync failed:', error);
    throw error;
  }
}

