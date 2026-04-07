"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  DollarSign,
  Gift,
  FileText,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  Menu,
  Building2,
  UserCircle,
  Shield,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: string[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Profile",
    href: "/profile",
    icon: UserCircle,
  },
  {
    title: "Employees",
    href: "/employees",
    icon: Users,
    permissions: [
      "view_all_employees",
      "view_team_employees",
      "manage_employees",
    ],
  },
  {
    title: "Probation Completions",
    href: "/probation-completions",
    icon: UserCheck,
    permissions: ["view_all_employees", "manage_employees"],
  },
  {
    title: "Departments",
    href: "/departments",
    icon: Building2,
    permissions: ["view_all_employees", "manage_employees"],
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: Clock,
    permissions: [
      "view_all_attendance",
      "view_team_attendance",
      "view_own_attendance",
    ],
  },
  {
    title: "Leave Management",
    href: "/leaves",
    icon: Calendar,
    permissions: [
      "view_all_leaves",
      "view_team_leaves",
      "view_own_leaves",
      "apply_leave",
    ],
  },
  {
    title: "Fines",
    href: "/fines",
    icon: DollarSign,
    permissions: [
      "view_all_fines",
      "view_team_fines",
      "view_own_fines",
      "manage_fines",
      "manage_team_fines",
    ],
  },
  {
    title: "Incentives",
    href: "/incentives",
    icon: Gift,
    permissions: [
      "view_all_incentives",
      "view_team_incentives",
      "view_own_incentives",
      "manage_incentives",
      "manage_team_incentives",
    ],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: FileText,
    permissions: ["view_reports", "view_team_reports"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permissions: ["manage_settings"],
  },
  {
    title: "Audit Logs",
    href: "/admin/audit-logs",
    icon: Shield,
    permissions: ["super_admin_only"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const filteredNavItems = navItems.filter((item) => {
    if (!item.permissions) return true;
    return item.permissions.some((p) => hasPermission(p));
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen border-r transition-all duration-500 ease-in-out relative overflow-hidden",
        isCollapsed ? "w-20" : "w-72",
      )}
      style={{
        backgroundColor: "#1a2937",
        borderColor: "rgba(0, 181, 118, 0.2)",
      }}
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#00b576] via-transparent to-transparent animate-pulse" />
      </div>

      {/* Header */}
      <div
        className="relative flex items-center justify-between p-5 border-b transition-all duration-300"
        style={{ borderColor: "rgba(0, 181, 118, 0.2)" }}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left duration-500">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110  relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0  transition-opacity duration-300" />
              <img
                src="/MPS LOGO only.png"
                alt="HR Portal Logo"
                className="h-10 w-10 relative z-10 object-contain"
              />
            </div>
            <span className="font-bold text-lg text-white tracking-wide">
              HR Portal
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-[#00b576]/20 transition-all duration-300 hover:scale-110 relative group"
        >
          <div className="absolute inset-0 bg-[#00b576] opacity-0 group-hover:opacity-20 rounded-md transition-opacity duration-300" />
          {isCollapsed ? (
            <Menu className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
          ) : (
            <ChevronLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-[#00b576]/30 scrollbar-track-transparent relative">
        {filteredNavItems.map((item, index) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isHovered = hoveredItem === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
                "transform hover:scale-105 hover:translate-x-1",
                isActive
                  ? "shadow-lg shadow-[#00b576]/30"
                  : "hover:shadow-md hover:shadow-[#00b576]/20",
                isCollapsed && "justify-center px-3",
              )}
              style={{
                backgroundColor: isActive
                  ? "#00b576"
                  : isHovered
                    ? "rgba(0, 181, 118, 0.15)"
                    : "transparent",
                animationDelay: `${index * 50}ms`,
              }}
              title={isCollapsed ? item.title : undefined}
            >
              {/* Animated background on hover */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-r from-[#00b576]/0 via-[#00b576]/20 to-[#00b576]/0 transition-transform duration-700",
                  isHovered ? "translate-x-0" : "-translate-x-full",
                )}
              />

              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full animate-pulse"
                  style={{ backgroundColor: "#ffffff" }}
                />
              )}

              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 relative z-10 transition-all duration-300",
                  isActive
                    ? "text-white scale-110"
                    : "text-gray-300 group-hover:text-[#00b576] group-hover:scale-110",
                )}
              />
              {!isCollapsed && (
                <span
                  className={cn(
                    "font-medium relative z-10 transition-all duration-300",
                    isActive
                      ? "text-white"
                      : "text-gray-300 group-hover:text-white",
                  )}
                >
                  {item.title}
                </span>
              )}

              {/* Ripple effect on active */}
              {isActive && (
                <div className="absolute right-3 w-2 h-2 rounded-full bg-white animate-ping" />
              )}
            </Link>
          );
        })}
      </nav>

      <Separator
        className="opacity-20"
        style={{ backgroundColor: "#00b576" }}
      />

      {/* Notifications Link */}
      <div className="p-3 relative">
        <Link
          href="/notifications"
          className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
            "hover:scale-105 hover:translate-x-1 hover:shadow-md hover:shadow-[#00b576]/20",
            isCollapsed && "justify-center px-3",
          )}
          style={{ backgroundColor: "rgba(0, 181, 118, 0.1)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#00b576]/0 via-[#00b576]/20 to-[#00b576]/0 transition-transform duration-700 group-hover:translate-x-0 -translate-x-full" />
          <Bell className="h-5 w-5 text-gray-300 group-hover:text-[#00b576] transition-all duration-300 group-hover:scale-110 relative z-10 group-hover:animate-bounce" />
          {!isCollapsed && (
            <span className="text-gray-300 group-hover:text-white font-medium transition-colors duration-300 relative z-10">
              Notifications
            </span>
          )}
        </Link>
      </div>

      {/* User Profile */}
      {user && (
        <div
          className={cn(
            "p-4 border-t relative transition-all duration-300",
            isCollapsed && "p-3",
          )}
          style={{
            borderColor: "rgba(0, 181, 118, 0.2)",
            backgroundColor: "rgba(0, 181, 118, 0.05)",
          }}
        >
          <div
            className={cn(
              "flex items-center gap-3 group",
              isCollapsed && "justify-center",
            )}
          >
            <div className="relative">
              <Avatar
                className="h-11 w-11 border-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-lg"
                style={{ borderColor: "#00b576" }}
              >
                <AvatarFallback
                  className="font-bold text-white text-sm"
                  style={{ backgroundColor: "#00b576" }}
                >
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 animate-pulse"
                style={{ backgroundColor: "#00b576", borderColor: "#1a2937" }}
              />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left duration-500">
                <p className="text-sm font-semibold text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p
                  className="text-xs truncate capitalize"
                  style={{ color: "#00b576" }}
                >
                  {user.role.replace("_", " ")}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Logout"
                className="text-gray-300 hover:text-white hover:bg-red-500/20 transition-all duration-300 hover:scale-110 hover:rotate-12 relative group"
              >
                <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-20 rounded-md transition-opacity duration-300" />
                <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
