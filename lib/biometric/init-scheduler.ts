/**
 * Initialize Biometric Scheduler
 * 
 * This file is imported in the root layout to start the scheduler
 * when the Next.js server starts
 */

import { startBiometricScheduler } from './scheduler';

// Only run on server-side
if (typeof window === 'undefined') {
  // Use a global flag to ensure scheduler only starts once
  const globalForScheduler = globalThis as unknown as {
    biometricSchedulerInitialized?: boolean;
  };

  if (!globalForScheduler.biometricSchedulerInitialized) {
    console.log('[Init] Initializing biometric scheduler...');
    
    // Start the scheduler
    startBiometricScheduler();
    
    // Mark as initialized
    globalForScheduler.biometricSchedulerInitialized = true;
    
    console.log('[Init] Biometric scheduler initialized successfully');
  }
}

// Export empty object to satisfy import
export {};

