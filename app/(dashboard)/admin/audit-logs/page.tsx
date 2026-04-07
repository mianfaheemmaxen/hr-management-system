"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Activity,
  Shield,
  FileText,
  AlertCircle,
  Loader2,
  Globe,
  Clock,
  Database,
  UserCog,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { AuditLog } from "@/lib/types";
import { Label } from "@radix-ui/react-dropdown-menu";

interface FilterOptions {
  actions: string[];
  entityTypes: string[];
  users: { id: string; firstName: string; lastName: string; email: string }[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    actions: [],
    entityTypes: [],
    users: [],
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    action: "",
    entityType: "",
    userId: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (user && user.role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch("/api/audit-logs/filters");
      if (response.ok) {
        const data = await response.json();
        setFilterOptions(data);
      }
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  };

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", pagination.limit.toString());
      if (filters.search) params.set("search", filters.search);
      if (filters.action) params.set("action", filters.action);
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    fetchFilterOptions();
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = (exportFormat: "csv" | "excel") => {
    const params = new URLSearchParams();
    params.set("export", exportFormat);
    if (filters.search) params.set("search", filters.search);
    if (filters.action) params.set("action", filters.action);
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    window.location.href = `/api/audit-logs?${params.toString()}`;
  };

  const handleSearch = () => fetchLogs(1);

  const handleReset = () => {
    setFilters({ search: "", action: "", entityType: "", userId: "", startDate: "", endDate: "" });
    fetchLogs(1);
  };

  const getActionBadgeColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: "bg-emerald-100 text-emerald-800 border-emerald-200",
      UPDATE: "bg-blue-100 text-blue-800 border-blue-200",
      DELETE: "bg-rose-100 text-rose-800 border-rose-200",
      LOGIN: "bg-green-100 text-green-800 border-green-200",
      LOGOUT: "bg-gray-100 text-gray-800 border-gray-200",
      FAILED_LOGIN: "bg-amber-100 text-amber-800 border-amber-200",
      EXPORT: "bg-purple-100 text-purple-800 border-purple-200",
      SYNC: "bg-cyan-100 text-cyan-800 border-cyan-200",
      APPROVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
      REJECT: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[action] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getEntityTypeBadgeColor = (entityType: string) => {
    const colors: Record<string, string> = {
      user: "bg-violet-100 text-violet-800 border-violet-200",
      employee: "bg-blue-100 text-blue-800 border-blue-200",
      attendance: "bg-emerald-100 text-emerald-800 border-emerald-200",
      leave: "bg-amber-100 text-amber-800 border-amber-200",
      fine: "bg-red-100 text-red-800 border-red-200",
      incentive: "bg-green-100 text-green-800 border-green-200",
      settings: "bg-slate-100 text-slate-800 border-slate-200",
      department: "bg-cyan-100 text-cyan-800 border-cyan-200",
      biometric: "bg-teal-100 text-teal-800 border-teal-200",
      export: "bg-purple-100 text-purple-800 border-purple-200",
    };
    return colors[entityType] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="p-4 rounded-full bg-rose-100 mx-auto w-20 h-20 flex items-center justify-center">
            <Shield className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Access Restricted</h1>
          <p className="text-gray-600">This page is only accessible to Super Administrators.</p>
          <Button 
            onClick={() => router.push("/dashboard")}
            className="bg-linear-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white mt-4"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="System Audit Logs" 
        description="Monitor all system activities and user actions"
      />

      <div className="p-6 space-y-6">


        {/* Filters Card */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="border-b bg-linear-to-t from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-[#1a2937]">
                  <Filter className="inline mr-2 h-5 w-5" />
                  Activity Filters
                </CardTitle>
                <CardDescription>
                  Filter system logs by various criteria
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  className="border-gray-300 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button 
                  onClick={handleSearch}
                  className="bg-linear-to-r from-[#00b576] to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Action</Label>
                <Select value={filters.action || "all"} onValueChange={(v) => setFilters({ ...filters, action: v === "all" ? "" : v })}>
                  <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                    <Activity className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="hover:bg-emerald-50">All Actions</SelectItem>
                    {filterOptions.actions.map((action) => (
                      <SelectItem key={action} value={action} className="hover:bg-emerald-50">
                        {action.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Entity</Label>
                <Select value={filters.entityType || "all"} onValueChange={(v) => setFilters({ ...filters, entityType: v === "all" ? "" : v })}>
                  <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                    <Database className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="All Entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="hover:bg-emerald-50">All Entities</SelectItem>
                    {filterOptions.entityTypes.map((type) => (
                      <SelectItem key={type} value={type} className="hover:bg-emerald-50">
                        {type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">User</Label>
                <Select value={filters.userId || "all"} onValueChange={(v) => setFilters({ ...filters, userId: v === "all" ? "" : v })}>
                  <SelectTrigger className="border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="hover:bg-emerald-50">All Users</SelectItem>
                    {filterOptions.users.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="hover:bg-emerald-50">
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    type="date" 
                    value={filters.startDate} 
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} 
                    className="pl-10 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    type="date" 
                    value={filters.endDate} 
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} 
                    className="pl-10 border-gray-300 focus:border-[#00b576] focus:ring-[#00b576]"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table Card */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="border-b bg-linear-to-t from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-[#1a2937]">
                  <Shield className="inline mr-2 h-5 w-5" />
                  Activity Logs
                </CardTitle>
                <CardDescription>
                  Showing {logs.length} of {pagination.totalCount.toLocaleString()} system activities
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleExport("csv")}
                  className="border-gray-300 hover:border-emerald-400 hover:bg-emerald-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleExport("excel")}
                  className="border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-linear-to-t from-gray-50 to-white">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-gray-900">Date & Time</TableHead>
                    <TableHead className="font-semibold text-gray-900">User</TableHead>
                    <TableHead className="font-semibold text-gray-900">Action</TableHead>
                    <TableHead className="font-semibold text-gray-900">Entity</TableHead>
                    <TableHead className="font-semibold text-gray-900">Description</TableHead>
                    <TableHead className="font-semibold text-gray-900">IP Address</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Loader2 className="h-8 w-8 text-[#00b576] animate-spin" />
                          <p className="text-gray-600">Loading audit logs...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="p-4 rounded-full bg-gray-100">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-gray-900">No audit logs found</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Try adjusting your filters or search criteria
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow 
                        key={log.id} 
                        className="group hover:bg-emerald-50/50 transition-colors duration-200"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <div className="font-mono text-sm">
                              {format(new Date(log.createdAt), "MMM dd, yyyy")}
                              <div className="text-xs text-gray-500">
                                {format(new Date(log.createdAt), "HH:mm:ss")}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                              <span className="text-sm font-semibold text-blue-700">
                                {log.userName?.charAt(0) || (log.user?.firstName?.charAt(0) || "S")}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">
                                {log.userName || (log.user ? `${log.user.firstName} ${log.user.lastName}` : "System")}
                              </p>
                              <p className="text-xs text-gray-500">
                                {log.userEmail || log.user?.email || "system@hrportal.com"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionBadgeColor(log.action)}>
                            {log.action.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getEntityTypeBadgeColor(log.entityType)}>
                            {log.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="text-sm text-gray-600 truncate" title={log.description || "-"}>
                            {log.description || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3 text-gray-400" />
                            <span className="font-mono text-xs text-gray-700">
                              {log.ipAddress || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedLog(log)}
                            className="h-8 w-8 p-0 hover:bg-emerald-100 hover:text-emerald-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-semibold text-gray-900">
                    {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900">
                    {pagination.totalCount.toLocaleString()}
                  </span>{" "}
                  entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-md">
                    <span className="text-sm font-medium text-gray-900">Page</span>
                    <span className="mx-1 font-semibold text-[#00b576]">{pagination.page}</span>
                    <span className="text-sm text-gray-600">of {pagination.totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(pagination.page + 1)}
                    disabled={!pagination.hasMore}
                    className="border-gray-300 hover:border-[#00b576] hover:bg-emerald-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto border border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1a2937]">
              <Shield className="h-5 w-5 text-emerald-600" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card className="border border-gray-200">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Timestamp</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <p className="font-mono text-gray-900">
                          {format(new Date(selectedLog.createdAt), "PPpp")}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">IP Address</p>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <p className="font-mono text-sm text-gray-900">
                          {selectedLog.ipAddress || "Not recorded"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">User</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-700">
                            {selectedLog.userName?.charAt(0) || (selectedLog.user?.firstName?.charAt(0) || "S")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {selectedLog.userName || (selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}` : "System")}
                          </p>
                          <p className="text-sm text-gray-500">
                            {selectedLog.userEmail || selectedLog.user?.email || "system@hrportal.com"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action & Entity */}
              <div className="grid grid-cols-2 gap-6">
                <Card className="border border-gray-200">
                  <CardContent className="pt-6 space-y-3">
                    <p className="text-sm font-medium text-gray-600">Action</p>
                    <Badge className={`text-base ${getActionBadgeColor(selectedLog.action)}`}>
                      {selectedLog.action.replace("_", " ")}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardContent className="pt-6 space-y-3">
                    <p className="text-sm font-medium text-gray-600">Entity</p>
                    <div className="space-y-2">
                      <Badge variant="outline" className={`text-base ${getEntityTypeBadgeColor(selectedLog.entityType)}`}>
                        {selectedLog.entityType}
                      </Badge>
                      {selectedLog.entityId && (
                        <p className="font-mono text-sm text-gray-600 mt-2">
                          ID: {selectedLog.entityId}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              <Card className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900">{selectedLog.description || "No description provided"}</p>
                </CardContent>
              </Card>

              {/* Data Changes */}
              {(selectedLog.oldValue || selectedLog.newValue) && (
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Data Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLog.oldValue && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">Previous Values</p>
                          <pre className="bg-gray-50 p-3 rounded-md text-xs border border-gray-200 overflow-x-auto">
                            {JSON.stringify(JSON.parse(selectedLog.oldValue), null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.newValue && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">New Values</p>
                          <pre className="bg-emerald-50 p-3 rounded-md text-xs border border-emerald-200 overflow-x-auto">
                            {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Context */}
              {selectedLog.context && (
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Additional Context</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-blue-50 p-3 rounded-md text-xs border border-blue-200 overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedLog.context), null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* User Agent */}
              {selectedLog.userAgent && (
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">User Agent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600 break-all">{selectedLog.userAgent}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}