"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { calculateLateMinutes, determineAttendanceStatus, calculateFineAmount, getOfficeStartTimeForDate } from "@/lib/attendance-utils";

interface ImportAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedRow {
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: string;
  lateMinutes: number;
  isCompensated: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ImportAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportAttendanceDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    graceMinutes: 15,
    fineRules: [],
    dailyTimings: null,
  });
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    finesGenerated: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchSettings();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setImportResult(null);
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      const parsed: ParsedRow[] = [];
      const parseErrors: string[] = [];

      jsonData.forEach((row, index) => {
        const employeeId = String(row["Employee ID"] || row["employeeId"] || "").trim();
        let dateValue = row["Date"] || row["date"];
        const checkInValue = row["Check In"] || row["checkIn"] || row["Check-In"];
        const checkOutValue = row["Check Out"] || row["checkOut"] || row["Check-Out"];

        // Skip empty rows
        if (!employeeId && !dateValue && !checkInValue) {
          return;
        }

        if (!employeeId || !dateValue || !checkInValue) {
          parseErrors.push(`Row ${index + 2}: Missing required fields (Employee ID, Date, Check In)`);
          return;
        }

        // Convert Excel date number to YYYY-MM-DD format
        let date: string;
        if (typeof dateValue === 'number') {
          // Excel date serial number
          const excelDate = XLSX.SSF.parse_date_code(dateValue);
          date = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
        } else {
          date = String(dateValue).trim();
          // Try to parse common date formats
          if (date.includes('/')) {
            // Handle MM/DD/YYYY or DD/MM/YYYY
            const parts = date.split('/');
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              const year = parts[2];
              date = `${year}-${month}-${day}`;
            }
          }
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          parseErrors.push(`Row ${index + 2}: Invalid date format "${date}". Use YYYY-MM-DD or let Excel format it as a date`);
          return;
        }

        // Validate employee exists
        const employee = employees.find((e) => e.employeeId === employeeId);
        if (!employee) {
          parseErrors.push(`Row ${index + 2}: Employee ID "${employeeId}" not found`);
          return;
        }

        // Parse and normalize time (handle both HH:MM and H:MM formats)
        const normalizeTime = (timeValue: any): string | null => {
          if (!timeValue) return null;

          let timeStr = String(timeValue).trim();

          // Handle Excel time decimal (e.g., 0.375 = 09:00)
          if (typeof timeValue === 'number' && timeValue < 1) {
            const totalMinutes = Math.round(timeValue * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          } else {
            // Handle string time formats
            const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
            if (timeMatch) {
              const hours = timeMatch[1].padStart(2, '0');
              const minutes = timeMatch[2];
              timeStr = `${hours}:${minutes}`;
            } else {
              return null;
            }
          }

          return timeStr;
        };

        const checkIn = normalizeTime(checkInValue);
        const checkOut = normalizeTime(checkOutValue);

        if (!checkIn) {
          parseErrors.push(`Row ${index + 2}: Invalid check-in time format. Use HH:MM (e.g., 09:00)`);
          return;
        }

        parsed.push({
          employeeId: employee.id,
          date,
          checkIn,
          checkOut: checkOut || undefined,
        });
      });

      setParsedData(parsed);
      setErrors(parseErrors);
    } catch (error) {
      console.error("Parse error:", error);
      setErrors(["Failed to parse file. Please check the file format and try again."]);
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);
    let success = 0;
    let failed = 0;
    let finesGenerated = 0;

    for (const row of parsedData) {
      try {
        const employee = employees.find((e) => e.id === row.employeeId);
        if (!employee) {
          failed++;
          continue;
        }

        // Get office start time for the specific date from daily timings
        const officeStartTime = getOfficeStartTimeForDate(
          row.date,
          settings.dailyTimings,
          '09:00' // Default fallback
        );

        const lateMinutes = calculateLateMinutes(
          row.checkIn,
          officeStartTime,
          settings.graceMinutes
        );

        const status = determineAttendanceStatus(
          row.checkIn,
          row.checkOut,
          officeStartTime,
          settings.graceMinutes
        );

        const attendanceRecord = {
          employeeId: row.employeeId,
          date: row.date,
          checkIn: row.checkIn,
          checkOut: row.checkOut,
          status,
          lateMinutes: lateMinutes > 0 ? lateMinutes : 0,
          isCompensated: false,
          source: "import",
        };

        // Save attendance record - API expects { records: [...] }
        const attendanceResponse = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: [attendanceRecord] }),
        });

        if (!attendanceResponse.ok) {
          failed++;
          continue;
        }

        const savedAttendance = await attendanceResponse.json();

        // Generate fine if late and not compensated
        if (lateMinutes > 0 && !attendanceRecord.isCompensated) {
          const fineAmount = calculateFineAmount(lateMinutes, settings.fineRules);
          if (fineAmount > 0) {
            await fetch("/api/fines", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                employeeId: row.employeeId,
                date: row.date,
                type: "late_arrival",
                amount: fineAmount,
                reason: `Late arrival by ${lateMinutes} minutes`,
                lateMinutes,
                status: "unpaid",
              }),
            });
            finesGenerated++;
          }
        }

        success++;
      } catch (error) {
        failed++;
      }
    }

    // Add audit log
    if (user) {
      await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: "import_attendance",
          entityType: "attendance",
          entityId: "bulk",
          newValue: JSON.stringify({ success, failed, finesGenerated }),
        }),
      });
    }

    setImportResult({ success, failed, finesGenerated });
    setIsProcessing(false);
    if (onSuccess) onSuccess();
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Attendance</DialogTitle>
          <DialogDescription>
            Upload an Excel file with attendance records. Required columns: Employee ID, Date, Check In.
            Optional: Check Out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                <span className="font-medium">{file.name}</span>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Excel files only (.xlsx, .xls)
                </p>
              </div>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-sm mt-2 max-h-32 overflow-y-auto">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData.length > 0 && errors.length === 0 && !importResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Ready to Import</AlertTitle>
              <AlertDescription>
                {parsedData.length} attendance records found and validated.
              </AlertDescription>
            </Alert>
          )}

          {/* Result */}
          {importResult && (
            <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Import Complete</AlertTitle>
              <AlertDescription>
                <p>Successfully imported: {importResult.success}</p>
                {importResult.failed > 0 && <p>Failed: {importResult.failed}</p>}
                <p>Fines generated: {importResult.finesGenerated}</p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importResult ? "Close" : "Cancel"}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={parsedData.length === 0 || errors.length > 0 || isProcessing}
            >
              {isProcessing ? "Importing..." : `Import ${parsedData.length} Records`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

