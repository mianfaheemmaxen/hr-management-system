"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { History, Calendar } from "lucide-react";

export default function LeaveBalanceHistoryPage() {
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get("employeeId");
  
  const [historyData, setHistoryData] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [employeeIdParam]);

  useEffect(() => {
    if (historyData && !selectedYear && historyData.years.length > 0) {
      setSelectedYear(historyData.years[0].toString());
    }
  }, [historyData]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const url = employeeIdParam 
        ? `/api/leave-balance/history?employeeId=${employeeIdParam}`
        : `/api/leave-balance/history`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  const yearData = selectedYear ? historyData?.data[selectedYear] || [] : [];

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Leave Balance History" description="View historical leave balance records" />
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-8 w-8" />
              Leave Balance History
            </h2>
            <p className="text-muted-foreground">
              View historical leave balance records by year
            </p>
          </div>

          {historyData?.years && historyData.years.length > 0 && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {historyData.years.map((year: number) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year} {year === historyData.currentYear && "(Current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!historyData || historyData.years.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No History Available</p>
              <p className="text-sm text-muted-foreground">
                Leave balance history will appear here once data is archived
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Leave Balances for {selectedYear}</span>
                  {yearData.length > 0 && yearData[0].isArchived && (
                    <Badge variant="secondary">Archived</Badge>
                  )}
                  {yearData.length > 0 && !yearData[0].isArchived && (
                    <Badge variant="default">Current Year</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {yearData.length > 0 && yearData[0].isArchived 
                    ? `Archived on ${new Date(yearData[0].archivedAt).toLocaleDateString()}`
                    : "Active leave balances for current year"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {yearData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No leave balance records for this year
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(
                      yearData.reduce((acc: any, item: any) => {
                        if (!acc[item.employeeId]) {
                          acc[item.employeeId] = [];
                        }
                        acc[item.employeeId].push(item);
                        return acc;
                      }, {})
                    ).map(([employeeId, balances]: [string, any]) => (
                      <EmployeeBalanceCard key={employeeId} employeeId={employeeId} balances={balances} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeBalanceCard({ employeeId, balances }: { employeeId: string; balances: any[] }) {
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    fetchEmployee();
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setEmployee(data);
      }
    } catch (error) {
      console.error("Failed to fetch employee:", error);
    }
  };

  if (!employee) {
    return null;
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-lg">
          {employee.user.firstName} {employee.user.lastName}
        </h3>
        <p className="text-sm text-muted-foreground">
          {employee.designation} • {employee.department?.name || "No Department"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {balances.map((balance, index) => (
          <div key={index} className="p-3 border rounded-lg bg-accent/50">
            <p className="text-sm font-medium capitalize mb-2">
              {balance.leaveType} Leave
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{balance.totalDays} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used:</span>
                <span className="font-medium text-red-600">{balance.usedDays} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-medium text-green-600">{balance.remainingDays} days</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

