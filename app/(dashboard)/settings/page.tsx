"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Save,
  Clock,
  DollarSign,
  Calendar,
  Shield,
  Plus,
  Trash2,
  Settings,
  Bell,
  FileText,
  Users,
  AlertCircle,
  Download,
  CheckCircle2,
  Loader2,
  Building,
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const [settings, setSettings] = useState<any>({
    companyName: "HR Portal",
    graceMinutes: 15,
    workingDaysPerWeek: 5,
    punctualityIncentiveAmount: 5000,
    sickLeaveQuota: 12,
    annualLeaveQuota: 15,
    complementaryLeaveQuota: 10,
    unpaidLeaveQuota: 0,
    maternityLeaveQuota: 180,
    umrahLeaveQuota: 15,
    fineRules: [],
    dailyTimings: null,
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  const canManageSettings = hasPermission("manage_settings");

  // Load settings, audit logs, and employees on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load settings
        const settingsResponse = await fetch("/api/settings");
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setSettings(settingsData);
          setLocalSettings(settingsData);
        }

        // Load audit logs
        const auditResponse = await fetch("/api/audit-logs?limit=50");
        if (auditResponse.ok) {
          const auditData = await auditResponse.json();
          setAuditLogs(auditData.data || []);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (canManageSettings) {
      loadData();
    }
  }, [canManageSettings]);

  if (!canManageSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <p className="text-lg font-semibold text-gray-900">Access Denied</p>
          <p className="text-sm text-gray-600">
            You don't have permission to access system settings
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-[#00b576] animate-spin" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localSettings),
      });

      if (response.ok) {
        setSettings(localSettings);
        alert("Settings saved successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to save settings: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAssignLeaveQuotas = async () => {
    console.log("🚀 Bulk assign button clicked!");
    const currentYear = new Date().getFullYear();
    const confirmed = confirm(
      `This will assign default leave quotas to ALL permanent employees for year ${currentYear}.\n\n` +
        `Employees on probation will NOT be assigned quotas.\n` +
        `Existing quotas will be skipped.\n\n` +
        `Do you want to continue?`,
    );

    if (!confirmed) return;

    setIsBulkAssigning(true);
    try {
      const response = await fetch("/api/leave-balance/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: currentYear }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `✅ Success!\n\n` +
            `${data.message}\n\n` +
            `📊 Details:\n` +
            `- Employees processed: ${data.employeesProcessed}\n` +
            `- Leave quotas assigned: ${data.assigned}\n` +
            `- Skipped (already exists): ${data.skipped}`,
        );
      } else {
        alert(
          `Failed to assign leave quotas: ${data.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Failed to bulk assign leave quotas:", error);
      alert("Failed to assign leave quotas. Please try again.");
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const recentLogs = auditLogs
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 50);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="System Settings"
        description="Configure system parameters and view audit logs"
      />

      <div className="p-6 space-y-6">
        {/* Main Settings Card */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="border-b bg-linear-to-t from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-[#1a2937]">
                  <Settings className="inline mr-2 h-5 w-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Configure system-wide settings and policies
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="p-6">
            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="bg-gray-100 p-1">
                <TabsTrigger
                  value="general"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="daily-timings"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Daily Timings
                </TabsTrigger>
                <TabsTrigger
                  value="fines"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Fine Rules
                </TabsTrigger>
                <TabsTrigger
                  value="leaves"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Leave Quotas
                </TabsTrigger>
                <TabsTrigger
                  value="audit"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00b576] data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Audit Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="general"
                className="space-y-6 animate-in fade-in"
              >
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#1a2937]">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Attendance Settings
                    </CardTitle>
                    <CardDescription>
                      Configure attendance and grace period settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="font-medium text-gray-700">
                          Grace Period (minutes)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={localSettings.graceMinutes}
                            onChange={(e) =>
                              setLocalSettings({
                                ...localSettings,
                                graceMinutes: parseInt(e.target.value),
                              })
                            }
                            className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] pl-10"
                          />
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500">
                          Late arrivals within this period won't be marked as
                          late
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-medium text-gray-700">
                          Working Days Per Week
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="1"
                            max="7"
                            value={localSettings.workingDaysPerWeek}
                            onChange={(e) =>
                              setLocalSettings({
                                ...localSettings,
                                workingDaysPerWeek: parseInt(e.target.value),
                              })
                            }
                            className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] pl-10"
                          />
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500">
                          Used for leave calculations and payroll
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> Office timings are now
                          configured per day in the Daily Timings tab.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#1a2937]">
                      <Shield className="h-5 w-5 text-emerald-600" />
                      Punctuality Settings
                    </CardTitle>
                    <CardDescription>
                      Configure punctuality incentive criteria and rewards
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-6 sm:grid-cols-3">
                      <div className="space-y-3">
                        <Label className="font-medium text-gray-700">
                          Punctuality Incentive Amount (Rs.)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={localSettings.punctualityIncentiveAmount}
                            onChange={(e) =>
                              setLocalSettings({
                                ...localSettings,
                                punctualityIncentiveAmount: parseInt(
                                  e.target.value,
                                ),
                              })
                            }
                            className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] pl-10"
                          />
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-medium text-gray-700">
                          Max Late Arrivals Allowed
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={localSettings.punctualityMaxLates || 0}
                          onChange={(e) =>
                            setLocalSettings({
                              ...localSettings,
                              punctualityMaxLates: parseInt(e.target.value),
                            })
                          }
                          className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="font-medium text-gray-700">
                          Min Attendance % Required
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={localSettings.minAttendancePercentage || 0}
                          onChange={(e) =>
                            setLocalSettings({
                              ...localSettings,
                              minAttendancePercentage: parseInt(e.target.value),
                            })
                          }
                          className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent
                value="daily-timings"
                className="space-y-6 animate-in fade-in"
              >
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#1a2937]">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Daily Office Timings
                    </CardTitle>
                    <CardDescription>
                      Configure office hours for each day of the week and mark
                      off days
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ].map((day) => {
                      const dayKey = day.toLowerCase();
                      const dayData = localSettings.dailyTimings?.[dayKey] || {
                        startTime: "09:00",
                        endTime: "18:00",
                        isOffDay: false,
                      };

                      return (
                        <div
                          key={day}
                          className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-[#00b576] transition-colors duration-200"
                        >
                          <div className="w-32 sm:w-40">
                            <Label className="text-base font-semibold text-gray-900">
                              {day}
                            </Label>
                          </div>

                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={!dayData.isOffDay}
                                onCheckedChange={(checked) => {
                                  const newDailyTimings = {
                                    ...localSettings.dailyTimings,
                                    [dayKey]: {
                                      ...dayData,
                                      isOffDay: !checked,
                                    },
                                  };
                                  setLocalSettings({
                                    ...localSettings,
                                    dailyTimings: newDailyTimings,
                                  });
                                }}
                                className="data-[state=checked]:bg-[#00b576]"
                              />
                              <Label className="text-sm font-medium text-gray-700">
                                {dayData.isOffDay ? (
                                  <span className="text-rose-600">Off Day</span>
                                ) : (
                                  <span className="text-emerald-600">
                                    Working Day
                                  </span>
                                )}
                              </Label>
                            </div>

                            {!dayData.isOffDay && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm text-gray-600">
                                    Start:
                                  </Label>
                                  <Input
                                    type="time"
                                    value={dayData.startTime}
                                    onChange={(e) => {
                                      const newDailyTimings = {
                                        ...localSettings.dailyTimings,
                                        [dayKey]: {
                                          ...dayData,
                                          startTime: e.target.value,
                                        },
                                      };
                                      setLocalSettings({
                                        ...localSettings,
                                        dailyTimings: newDailyTimings,
                                      });
                                    }}
                                    className="w-32 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <Label className="text-sm text-gray-600">
                                    End:
                                  </Label>
                                  <Input
                                    type="time"
                                    value={dayData.endTime}
                                    onChange={(e) => {
                                      const newDailyTimings = {
                                        ...localSettings.dailyTimings,
                                        [dayKey]: {
                                          ...dayData,
                                          endTime: e.target.value,
                                        },
                                      };
                                      setLocalSettings({
                                        ...localSettings,
                                        dailyTimings: newDailyTimings,
                                      });
                                    }}
                                    className="w-32 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
                        <p className="text-sm text-emerald-700">
                          <strong>Note:</strong> Configure office hours for each
                          day of the week. Mark days as "Off Day" for weekends
                          or holidays. These timings will be used for attendance
                          tracking and late arrival calculations.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Daily Timings"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent
                value="fines"
                className="space-y-6 animate-in fade-in"
              >
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#1a2937]">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                      Fine Rules
                    </CardTitle>
                    <CardDescription>
                      Late arrival fine amounts based on minutes late
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Fine Rules Configuration
                            </h3>
                            <p className="text-sm text-gray-600">
                              Add rules for different late arrival intervals
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-[#00b576] text-[#00b576]"
                          >
                            {localSettings.fineRules?.length || 0} Rules
                          </Badge>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead className="font-semibold text-gray-900">
                                Min Minutes
                              </TableHead>
                              <TableHead className="font-semibold text-gray-900">
                                Max Minutes
                              </TableHead>
                              <TableHead className="font-semibold text-gray-900">
                                Fine Amount (Rs.)
                              </TableHead>
                              <TableHead className="w-[100px] font-semibold text-gray-900">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(localSettings.fineRules || []).length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="text-center py-12"
                                >
                                  <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="p-3 rounded-full bg-gray-100">
                                      <DollarSign className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 font-medium">
                                      No fine rules configured
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      Click "Add Rule" to create your first rule
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              (localSettings.fineRules || []).map(
                                (rule: any, index: number) => (
                                  <TableRow
                                    key={index}
                                    className="group hover:bg-emerald-50/50 transition-colors duration-200"
                                  >
                                    <TableCell>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={rule.minMinutes}
                                        onChange={(e) => {
                                          const newRules = [
                                            ...(localSettings.fineRules || []),
                                          ];
                                          newRules[index].minMinutes =
                                            parseInt(e.target.value) || 0;
                                          setLocalSettings({
                                            ...localSettings,
                                            fineRules: newRules,
                                          });
                                        }}
                                        className="w-24 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={rule.maxMinutes || ""}
                                        placeholder="∞"
                                        onChange={(e) => {
                                          const newRules = [
                                            ...(localSettings.fineRules || []),
                                          ];
                                          newRules[index].maxMinutes = e.target
                                            .value
                                            ? parseInt(e.target.value)
                                            : null;
                                          setLocalSettings({
                                            ...localSettings,
                                            fineRules: newRules,
                                          });
                                        }}
                                        className="w-24 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={rule.amount}
                                          onChange={(e) => {
                                            const newRules = [
                                              ...(localSettings.fineRules ||
                                                []),
                                            ];
                                            newRules[index].amount =
                                              parseInt(e.target.value) || 0;
                                            setLocalSettings({
                                              ...localSettings,
                                              fineRules: newRules,
                                            });
                                          }}
                                          className="w-32 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] pl-8"
                                        />
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const newRules = (
                                            localSettings.fineRules || []
                                          ).filter(
                                            (_: any, i: number) => i !== index,
                                          );
                                          setLocalSettings({
                                            ...localSettings,
                                            fineRules: newRules,
                                          });
                                        }}
                                        className="h-8 w-8 p-0 hover:bg-rose-50 hover:text-rose-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ),
                              )
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const newRules = [...(localSettings.fineRules || [])];
                          const lastRule = newRules[newRules.length - 1];
                          const newMinMinutes = lastRule
                            ? (lastRule.maxMinutes || 0) + 1
                            : 1;
                          newRules.push({
                            minMinutes: newMinMinutes,
                            maxMinutes: null,
                            amount: 0,
                          });
                          setLocalSettings({
                            ...localSettings,
                            fineRules: newRules,
                          });
                        }}
                        className="border-[#00b576] text-[#00b576] hover:bg-emerald-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Rule
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? "Saving..." : "Save Fine Rules"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="leaves"
                className="space-y-6 animate-in fade-in"
              >
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#1a2937]">
                      <Calendar className="h-5 w-5 text-amber-600" />
                      Leave Quotas
                    </CardTitle>
                    <CardDescription>
                      Configure default annual leave allocation per leave type
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="font-medium text-gray-700">
                          Sick Leave (days/year)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={localSettings.sickLeaveQuota || 0}
                            onChange={(e) =>
                              setLocalSettings({
                                ...localSettings,
                                sickLeaveQuota: parseInt(e.target.value) || 0,
                              })
                            }
                            className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] pl-10"
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-medium text-gray-700">
                          Annual Leave (days/year)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={localSettings.annualLeaveQuota || 0}
                            onChange={(e) =>
                              setLocalSettings({
                                ...localSettings,
                                annualLeaveQuota: parseInt(e.target.value) || 0,
                              })
                            }
                            className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] pl-10"
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-medium text-gray-700">
                          Complementary Leave (days/year)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={localSettings.complementaryLeaveQuota || 0}
                            onChange={(e) =>
                              setLocalSettings({
                                ...localSettings,
                                complementaryLeaveQuota:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] pl-10"
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-medium text-gray-700">
                          Maternity Leave (days/year)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={localSettings.maternityLeaveQuota || 0}
                            onChange={(e) =>
                              setLocalSettings({
                                ...localSettings,
                                maternityLeaveQuota:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] pl-10"
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-medium text-gray-700">
                          Umrah Leave (days/year)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={localSettings.umrahLeaveQuota || 0}
                            onChange={(e) =>
                              setLocalSettings({
                                ...localSettings,
                                umrahLeaveQuota: parseInt(e.target.value) || 0,
                              })
                            }
                            className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576] pl-10"
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-gradient-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? "Saving..." : "Save Leave Quotas"}
                      </Button>
                      <Button
                        onClick={handleBulkAssignLeaveQuotas}
                        disabled={isBulkAssigning}
                        variant="outline"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {isBulkAssigning ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Assigning...
                          </>
                        ) : (
                          "Assign to All Permanent Employees"
                        )}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">
                              ℹ️ Unpaid Leave
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                              Unpaid leaves have no quota limit and are always
                              available to employees. They do not need to be
                              configured or assigned.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-emerald-800">
                              Note:
                            </p>
                            <p className="text-sm text-emerald-700 mt-1">
                              The "Assign to All Permanent Employees" button
                              will automatically assign these default quotas to
                              all employees with <strong>Permanent</strong>{" "}
                              employment status. Employees on{" "}
                              <strong>Probation</strong> will not receive
                              automatic quotas and must be assigned manually.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="audit"
                className="space-y-6 animate-in fade-in"
              >
                <Card className="border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-[#1a2937]">
                          <FileText className="h-5 w-5 text-gray-600" />
                          Audit Logs
                        </CardTitle>
                        <CardDescription>
                          Recent system activity and configuration changes
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-gray-300 text-gray-600"
                      >
                        {recentLogs.length} Recent Logs
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead className="font-semibold text-gray-900">
                                Timestamp
                              </TableHead>
                              <TableHead className="font-semibold text-gray-900">
                                User
                              </TableHead>
                              <TableHead className="font-semibold text-gray-900">
                                Action
                              </TableHead>
                              <TableHead className="font-semibold text-gray-900">
                                Entity
                              </TableHead>
                              <TableHead className="font-semibold text-gray-900">
                                Details
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentLogs.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-center py-12"
                                >
                                  <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="p-3 rounded-full bg-gray-100">
                                      <FileText className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 font-medium">
                                      No audit logs found
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      System activity will appear here
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              recentLogs.map((log) => (
                                <TableRow
                                  key={log.id}
                                  className="group hover:bg-gray-50 transition-colors duration-200"
                                >
                                  <TableCell className="text-sm">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-3 w-3 text-gray-400" />
                                      {format(
                                        new Date(log.createdAt),
                                        "MMM d, yyyy HH:mm",
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-gray-700">
                                          {log.user
                                            ? log.user.firstName?.charAt(0) ||
                                              "U"
                                            : "U"}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900">
                                          {log.user
                                            ? `${log.user.firstName} ${log.user.lastName}`
                                            : "Unknown"}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={
                                        log.action === "CREATE"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : log.action === "UPDATE"
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : "bg-gray-50 text-gray-700 border-gray-200"
                                      }
                                    >
                                      {log.action}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="capitalize text-gray-700 font-medium">
                                    {log.entityType}
                                  </TableCell>
                                  <TableCell className="max-w-50 truncate text-sm text-gray-600">
                                    {log.newValue || "-"}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  );
}
