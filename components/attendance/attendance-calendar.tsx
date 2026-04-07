"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  getDay,
  isWeekend,
} from "date-fns";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: "on_time" | "late" | "absent" | "leave" | "half_day";
  checkIn?: string;
  checkOut?: string;
  lateMinutes?: number;
}

interface AttendanceCalendarProps {
  employeeId?: string;
  showEmployeeSelector?: boolean;
}

export function AttendanceCalendar({
  employeeId,
  showEmployeeSelector = false,
}: AttendanceCalendarProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || "");

  const activeEmployees = employees.filter((e: any) => e.status === "active");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week offset (0 = Sunday)
  const startDayOffset = getDay(monthStart);

  // Get attendance for selected employee in current month
  const monthAttendance = useMemo(() => {
    if (!selectedEmployeeId) return {};
    const records = attendance.filter(
      (a) =>
        a.employeeId === selectedEmployeeId &&
        a.date >= format(monthStart, "yyyy-MM-dd") &&
        a.date <= format(monthEnd, "yyyy-MM-dd")
    );
    return records.reduce((acc, record) => {
      acc[record.date] = record;
      return acc;
    }, {} as Record<string, AttendanceRecord>);
  }, [attendance, selectedEmployeeId, monthStart, monthEnd]);

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "on_time":
        return "bg-green-500";
      case "late":
        return "bg-yellow-500";
      case "absent":
        return "bg-red-500";
      case "half_day":
        return "bg-orange-500";
      case "leave":
        return "bg-blue-500";
      default:
        return "bg-gray-200";
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate stats
  const stats = useMemo(() => {
    const records = Object.values(monthAttendance);
    return {
      onTime: records.filter((r) => r.status === "on_time").length,
      late: records.filter((r) => r.status === "late").length,
      absent: records.filter((r) => r.status === "absent").length,
      leave: records.filter((r) => r.status === "leave").length,
      halfDay: records.filter((r) => r.status === "half_day").length,
    };
  }, [monthAttendance]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Attendance Calendar</CardTitle>
          <div className="flex items-center gap-4">
            {showEmployeeSelector && (
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedEmployeeId ? (
          <p className="text-center text-muted-foreground py-8">
            Select an employee to view their attendance calendar
          </p>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm">On Time ({stats.onTime})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Late ({stats.late})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm">Absent ({stats.absent})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm">Leave ({stats.leave})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-sm">Half Day ({stats.halfDay})</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

              {/* Empty cells for offset */}
              {Array.from({ length: startDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days */}
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const record = monthAttendance[dateStr];
                const isWeekendDay = isWeekend(day);

                return (
                  <div
                    key={dateStr}
                    className={`aspect-square border rounded-lg p-1 flex flex-col items-center justify-center ${
                      isWeekendDay ? "bg-muted/50" : ""
                    }`}
                  >
                    <span
                      className={`text-sm ${
                        isWeekendDay ? "text-muted-foreground" : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {record && (
                      <div
                        className={`h-2 w-2 rounded-full mt-1 ${getStatusColor(
                          record.status
                        )}`}
                        title={`${record.status}${
                          record.lateMinutes ? ` (${record.lateMinutes} min late)` : ""
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

