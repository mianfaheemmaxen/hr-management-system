/**
 * Biometric Attendance System Integration Service
 * 
 * This service handles all communication with the biometric attendance system APIs
 */

const BIOMETRIC_BASE_URL = process.env.BIOMETRIC_API_URL || "http://10.10.50.18:8081";
const BIOMETRIC_USERNAME = process.env.BIOMETRIC_USERNAME || "faheem.fiaz";
const BIOMETRIC_PASSWORD = process.env.BIOMETRIC_PASSWORD || '3_Xy*s9A"zok_G5O';

// Create Basic Auth header
const getAuthHeader = () => {
  const credentials = Buffer.from(`${BIOMETRIC_USERNAME}:${BIOMETRIC_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
};

export interface BiometricEmployee {
  id: number;
  emp_code: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  format_name: string;
  full_name: string;
  department: {
    id: number;
    dept_code: string;
    dept_name: string;
  } | null;
  position: {
    id: number;
    position_code: string;
    position_name: string;
  } | null;
  hire_date: string | null;
  email: string | null;
  mobile: string | null;
}

export interface BiometricEmployeeResponse {
  count: number;
  next: string | null;
  previous: string | null;
  msg: string;
  code: number;
  data: BiometricEmployee[];
}

export interface BiometricAttendanceRecord {
  id: string;
  emp_id: number;
  emp_code: string;
  first_name: string;
  last_name: string | null;
  dept_code: string;
  dept_name: string;
  position_code: string | null;
  position_name: string | null;
  att_date: string;
  weekday: string;
  check_in: string;
  check_out: string;
  clock_in: string | null;
  clock_out: string | null;
  work_day: string;
  duration: string;
  total_hrs: string;
  worked_hrs: string;
  actual_worked: string;
  total_ot: string;
  early_in: string;
  late_out: string;
}

export interface BiometricAttendanceResponse {
  count: number;
  next: string | null;
  previous: string | null;
  msg: string;
  code: number;
  data: BiometricAttendanceRecord[];
}

// New simpler daily attendance record from firstInLastOutReport API
export interface DailyAttendanceRecord {
  emp_code: string;
  first_name: string;
  last_name: string | null;
  nick_name: string | null;
  gender: string | null;
  dept_code: string;
  dept_name: string;
  position_code: string | null;
  position_name: string | null;
  company_code: string;
  company_name: string;
  att_date: string;
  weekday: string;
  check_in: string | null;
  check_out: string | null;
  total_time: string;
}

export interface DailyAttendanceResponse {
  count: number;
  next: string | null;
  previous: string | null;
  msg: string;
  code: number;
  data: DailyAttendanceRecord[];
}

class BiometricService {
  /**
   * Fetch all employees from biometric system
   * @param page Page number (default: 1)
   * @param pageSize Number of records per page (default: 5000)
   */
  async fetchEmployees(page: number = 1, pageSize: number = 5000): Promise<BiometricEmployeeResponse> {
    try {
      const url = `${BIOMETRIC_BASE_URL}/personnel/api/employees/?page=${page}&page_size=${pageSize}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Biometric API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching employees from biometric system:', error);
      throw error;
    }
  }

  /**
   * Fetch all employees (handles pagination automatically)
   */
  async fetchAllEmployees(): Promise<BiometricEmployee[]> {
    const allEmployees: BiometricEmployee[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.fetchEmployees(page, 5000);
      allEmployees.push(...response.data);

      hasMore = response.next !== null;
      page++;
    }

    return allEmployees;
  }

  /**
   * Fetch attendance records for specific employees
   * @param employeeIds Array of biometric employee IDs (comma-separated string like "19,194,40,195,16")
   * @param startDate Start date (YYYY-MM-DD format like "2026-01-02")
   * @param endDate End date (YYYY-MM-DD format like "2026-01-02")
   */
  async fetchAttendance(
    employeeIds: string,
    startDate: string,
    endDate: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<BiometricAttendanceResponse> {
    try {
      // Build URL with exact parameters as specified
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        start_date: startDate,
        end_date: endDate,
        departments: '-1',
        areas: '-1',
        groups: '-1',
        employees: employeeIds
      });

      const url = `${BIOMETRIC_BASE_URL}/att/api/totalTimeCardReportV2/?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Biometric API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching attendance from biometric system:', error);
      throw error;
    }
  }

  /**
   * Fetch all attendance records (handles pagination automatically)
   * @param employeeIds Comma-separated string of biometric IDs (e.g., "19,194,40,195,16")
   */
  async fetchAllAttendance(
    employeeIds: string,
    startDate: string,
    endDate: string
  ): Promise<BiometricAttendanceRecord[]> {
    const allRecords: BiometricAttendanceRecord[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.fetchAttendance(employeeIds, startDate, endDate, page, 100);
      allRecords.push(...response.data);

      hasMore = response.next !== null;
      page++;

      // Safety limit to prevent infinite loops
      if (page > 100) {
        console.warn('Reached maximum page limit (100) for attendance fetch');
        break;
      }
    }

    return allRecords;
  }

  /**
   * Fetch daily attendance using firstInLastOutReport API
   * This is the preferred method for getting today's attendance
   * @param date Date in YYYY-MM-DD format
   * @param departmentId Department ID (1 for main department, -1 for all)
   */
  async fetchDailyAttendance(
    date: string,
    departmentId: string = '1',
    page: number = 1,
    pageSize: number = 5000
  ): Promise<DailyAttendanceResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        start_date: date,
        end_date: date,
        departments: departmentId,
        areas: '-1',
        groups: '-1',
        employees: '-1'
      });

      const url = `${BIOMETRIC_BASE_URL}/att/api/firstInLastOutReport/?${params.toString()}`;

      console.log(`[Biometric] Fetching daily attendance from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Biometric API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[Biometric] Fetched ${data.count} daily attendance records`);
      return data;
    } catch (error) {
      console.error('Error fetching daily attendance from biometric system:', error);
      throw error;
    }
  }

  /**
   * Fetch all daily attendance records (handles pagination automatically)
   * @param date Date in YYYY-MM-DD format
   * @param departmentId Department ID (1 for main department)
   */
  async fetchAllDailyAttendance(
    date: string,
    departmentId: string = '1'
  ): Promise<DailyAttendanceRecord[]> {
    const allRecords: DailyAttendanceRecord[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.fetchDailyAttendance(date, departmentId, page, 5000);
      allRecords.push(...response.data);

      hasMore = response.next !== null;
      page++;

      // Safety limit
      if (page > 50) {
        console.warn('Reached maximum page limit (50) for daily attendance fetch');
        break;
      }
    }

    return allRecords;
  }
}

export const biometricService = new BiometricService();

