/**
 * Test script for biometric API integration
 * 
 * Run with: npx ts-node scripts/test-biometric-api.ts
 */

import { biometricService } from '../lib/biometric/biometric-service';

async function testBiometricAPIs() {
  console.log('=== Testing Biometric API Integration ===\n');

  try {
    // Test 1: Fetch employees
    console.log('Test 1: Fetching employees from biometric system...');
    const employeesResponse = await biometricService.fetchEmployees(1, 5);
    console.log(`✓ Success! Found ${employeesResponse.count} total employees`);
    console.log(`✓ Fetched ${employeesResponse.data.length} employees in this page`);
    
    if (employeesResponse.data.length > 0) {
      const firstEmp = employeesResponse.data[0];
      console.log('\nSample Employee:');
      console.log(`  ID: ${firstEmp.id}`);
      console.log(`  Code: ${firstEmp.emp_code}`);
      console.log(`  Name: ${firstEmp.full_name}`);
      console.log(`  Department: ${firstEmp.department?.dept_name || 'N/A'}`);
      console.log(`  Position: ${firstEmp.position?.position_name || 'N/A'}`);
      
      // Test 2: Fetch attendance for this employee
      console.log('\n\nTest 2: Fetching attendance for employee...');
      const today = new Date().toISOString().split('T')[0];
      const attendanceResponse = await biometricService.fetchAttendance(
        firstEmp.id.toString(),
        today,
        today,
        1,
        20
      );
      
      console.log(`✓ Success! Found ${attendanceResponse.count} attendance records`);
      
      if (attendanceResponse.data.length > 0) {
        const firstAtt = attendanceResponse.data[0];
        console.log('\nSample Attendance Record:');
        console.log(`  Employee: ${firstAtt.first_name} (${firstAtt.emp_code})`);
        console.log(`  Date: ${firstAtt.att_date}`);
        console.log(`  Clock In: ${firstAtt.clock_in || 'Not clocked in'}`);
        console.log(`  Clock Out: ${firstAtt.clock_out || 'Not clocked out'}`);
        console.log(`  Check In: ${firstAtt.check_in}`);
        console.log(`  Check Out: ${firstAtt.check_out}`);
        console.log(`  Late Out: ${firstAtt.late_out || 'N/A'}`);
      } else {
        console.log('  No attendance records found for today');
      }
    }

    console.log('\n\n=== All Tests Passed! ===');
    console.log('\nNext Steps:');
    console.log('1. Link employees in HR portal to biometric IDs');
    console.log('2. Run manual sync: POST /api/biometric/sync-employees');
    console.log('3. Run attendance sync: POST /api/biometric/sync-attendance');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the tests
testBiometricAPIs();

