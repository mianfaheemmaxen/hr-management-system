import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface EmployeeAttendanceData {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  isCompensated: boolean;
  gender?: string;
  leaveReason?: string;
}

export interface DepartmentSummary {
  department: string;
  strength: number;
  present: number;
  leave: number;
  absent: number;
  nonWorkingSaturday: number;
}

// Keep old interface for backward compatibility
export interface DailyAttendanceExportData extends EmployeeAttendanceData {}

/**
 * Generate department summary from employee data
 */
function generateDepartmentSummary(
  employees: EmployeeAttendanceData[]
): DepartmentSummary[] {
  const deptMap = new Map<string, DepartmentSummary>();

  employees.forEach((emp) => {
    if (!deptMap.has(emp.department)) {
      deptMap.set(emp.department, {
        department: emp.department,
        strength: 0,
        present: 0,
        leave: 0,
        absent: 0,
        nonWorkingSaturday: 0,
      });
    }

    const dept = deptMap.get(emp.department)!;
    dept.strength++;

    if (emp.status === "on_time" || emp.status === "late") {
      dept.present++;
    } else if (emp.status === "leave") {
      dept.leave++;
    } else if (emp.status === "absent") {
      dept.absent++;
    }
  });

  return Array.from(deptMap.values());
}

/**
 * Export daily attendance report to CSV (simple format)
 */
export function exportDailyAttendanceToCSV(
  employees: EmployeeAttendanceData[],
  date: string
) {
  const deptSummary = generateDepartmentSummary(employees);

  const csvData = deptSummary.map((dept, idx) => ({
    "Sr. #": idx + 1,
    "Department / Team": dept.department,
    Strength: dept.strength,
    Present: dept.present,
    Leave: dept.leave,
    Absent: dept.absent,
    "Non Working Saturday": dept.nonWorkingSaturday,
  }));

  const ws = XLSX.utils.json_to_sheet(csvData);
  ws["!cols"] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Summary");

  const filename = `Daily Attendance Report ${format(
    new Date(date),
    "d-MMM-yy"
  )}.csv`;
  XLSX.writeFile(wb, filename, { bookType: "csv" });
}

/**
 * Build Excel worksheet data matching original format
 */
function buildExcelData(
  employees: EmployeeAttendanceData[],
  date: string
): (string | number)[][] {
  const ws_data: (string | number)[][] = [];

  // Title row
  ws_data.push(["", "", "", "", " Daily Attendance\nReport", "", "", ""]);
  ws_data.push([
    format(new Date(date), "d-MMM-yyyy"),
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  // Department summary header
  ws_data.push([
    "Sr. #",
    "Department /\nTeam",
    "",
    "Strength",
    "Present",
    "Leave",
    "Absent/\nNot Yet Arrived",
    "Non Working\nSaturday",
  ]);

  // Generate department summary
  const deptSummary = generateDepartmentSummary(employees);
  let srNo = 1;
  let totalStrength = 0,
    totalPresent = 0,
    totalLeave = 0,
    totalAbsent = 0,
    totalNonWorking = 0;

  deptSummary.forEach((dept) => {
    ws_data.push([
      srNo++,
      dept.department,
      "",
      dept.strength,
      dept.present,
      dept.leave,
      dept.absent,
      dept.nonWorkingSaturday,
    ]);
    totalStrength += dept.strength;
    totalPresent += dept.present;
    totalLeave += dept.leave;
    totalAbsent += dept.absent;
    totalNonWorking += dept.nonWorkingSaturday;
  });

  ws_data.push([
    "Total ",
    "",
    "",
    totalStrength,
    totalPresent,
    totalLeave,
    totalAbsent,
    totalNonWorking,
  ]);
  ws_data.push([], []);

  // Details of Employees on Leave
  ws_data.push(["", "", "", "Details of Employee on Leave", "", "", "", ""]);
  ws_data.push([]);
  ws_data.push(["Sr #.", "Employee Name", "", "", "Reason", "", "", ""]);

  const onLeave = employees.filter((e) => e.status === "leave");
  onLeave.forEach((emp, idx) => {
    ws_data.push([
      idx + 1,
      emp.employeeName,
      "",
      "",
      emp.leaveReason || "On leave.",
      "",
      "",
      "",
    ]);
  });
  if (onLeave.length === 0)
    ws_data.push(["", "No employees on leave", "", "", "", "", "", ""]);

  ws_data.push([], []);

  // Absentee's Details
  ws_data.push(["", "", "", "Absentee's Details", "", "", "", ""]);
  ws_data.push([]);
  ws_data.push(["Sr#.", "Employee Name", "", "", "", "", "", ""]);

  const absent = employees.filter((e) => e.status === "absent");
  absent.forEach((emp, idx) =>
    ws_data.push([idx + 1, emp.employeeName, "", "", "", "", "", ""])
  );
  if (absent.length === 0)
    ws_data.push(["", "No absentees", "", "", "", "", "", ""]);

  ws_data.push([]);

  // Not Yet Arrived (late employees)
  ws_data.push(["", "", "", "Not Yet Arrived/Late Arrivals", "", "", "", ""]);
  ws_data.push([]);
  ws_data.push(["Sr#.", "Employee Name", "", "", "", "", "", ""]);

  const late = employees.filter((e) => e.status === "late");
  late.forEach((emp, idx) =>
    ws_data.push([idx + 1, emp.employeeName, "", "", "", "", "", ""])
  );
  if (late.length === 0)
    ws_data.push(["", "All employees arrived on time", "", "", "", "", "", ""]);

  ws_data.push([]);

  // Gender count
  const maleCount = employees.filter((e) => e.gender === "male").length;
  const femaleCount = employees.filter((e) => e.gender === "female").length;
  ws_data.push([
    `Male Staff:      ${maleCount}\nFemale Staff:    ${femaleCount}`,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  return ws_data;
}

/**
 * Export daily attendance report to Excel (matching original format)
 */
export function exportDailyAttendanceToExcel(
  employees: EmployeeAttendanceData[],
  date: string
) {
  const wb = XLSX.utils.book_new();
  const ws_data = buildExcelData(employees, date);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Set column widths
  ws["!cols"] = [
    { wch: 8 }, // Sr#
    { wch: 30 }, // Department/Name
    { wch: 5 }, // Empty
    { wch: 10 }, // Strength
    { wch: 10 }, // Present
    { wch: 10 }, // Leave
    { wch: 18 }, // Absent
    { wch: 15 }, // Non Working
  ];

  // Add worksheet to workbook
  const sheetName = format(new Date(date), "MMM-yy");
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate filename
  const filename = `Daily Attendance Report ${format(
    new Date(date),
    "d-MMM-yy"
  )}.xlsx`;

  // Download Excel
  XLSX.writeFile(wb, filename);
}

/**
 * Export daily attendance report to PDF (matching original format)
 */
export function exportDailyAttendanceToPDF(
  employees: EmployeeAttendanceData[],
  date: string,
  _summary?: {
    totalEmployees: number;
    present: number;
    absent: number;
    late: number;
    onTime: number;
  }
) {
  const doc = new jsPDF("landscape");
  const deptSummary = generateDepartmentSummary(employees);

  // Add title
  doc.setFontSize(18);
  doc.text("Daily Attendance Report", 14, 20);

  // Add date
  doc.setFontSize(12);
  doc.text(format(new Date(date), "d-MMM-yyyy"), 14, 28);

  // Department Summary Table
  const deptTableData = deptSummary.map((dept, idx) => [
    idx + 1,
    dept.department,
    dept.strength,
    dept.present,
    dept.leave,
    dept.absent,
    dept.nonWorkingSaturday,
  ]);

  // Calculate totals
  const totals = deptSummary.reduce(
    (acc, dept) => ({
      strength: acc.strength + dept.strength,
      present: acc.present + dept.present,
      leave: acc.leave + dept.leave,
      absent: acc.absent + dept.absent,
      nonWorking: acc.nonWorking + dept.nonWorkingSaturday,
    }),
    { strength: 0, present: 0, leave: 0, absent: 0, nonWorking: 0 }
  );

  deptTableData.push([
    "Total",
    "",
    totals.strength,
    totals.present,
    totals.leave,
    totals.absent,
    totals.nonWorking,
  ]);

  autoTable(doc, {
    head: [
      [
        "Sr. #",
        "Department / Team",
        "Strength",
        "Present",
        "Leave",
        "Absent",
        "Non Working Saturday",
      ],
    ],
    body: deptTableData,
    startY: 35,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Get current Y position after table
  let currentY = (doc as any).lastAutoTable.finalY + 15;

  // Employees on Leave
  const onLeave = employees.filter((e) => e.status === "leave");
  if (onLeave.length > 0) {
    doc.setFontSize(12);
    doc.text("Details of Employees on Leave", 14, currentY);
    currentY += 5;

    autoTable(doc, {
      head: [["Sr #.", "Employee Name", "Reason"]],
      body: onLeave.map((emp, idx) => [
        idx + 1,
        emp.employeeName,
        emp.leaveReason || "On leave.",
      ]),
      startY: currentY,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [100, 100, 100] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Absentees
  const absent = employees.filter((e) => e.status === "absent");
  if (absent.length > 0) {
    doc.setFontSize(12);
    doc.text("Absentee's Details", 14, currentY);
    currentY += 5;

    autoTable(doc, {
      head: [["Sr #.", "Employee Name"]],
      body: absent.map((emp, idx) => [idx + 1, emp.employeeName]),
      startY: currentY,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [100, 100, 100] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Late arrivals
  const late = employees.filter((e) => e.status === "late");
  if (late.length > 0) {
    doc.setFontSize(12);
    doc.text("Not Yet Arrived / Late", 14, currentY);
    currentY += 5;

    autoTable(doc, {
      head: [["Sr #.", "Employee Name"]],
      body: late.map((emp, idx) => [idx + 1, emp.employeeName]),
      startY: currentY,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [100, 100, 100] },
    });
  }

  // Add footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Generated on ${format(
        new Date(),
        "MMM dd, yyyy hh:mm a"
      )} | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Generate filename
  const filename = `Daily Attendance Report ${format(
    new Date(date),
    "d-MMM-yy"
  )}.pdf`;

  // Download PDF
  doc.save(filename);
}
