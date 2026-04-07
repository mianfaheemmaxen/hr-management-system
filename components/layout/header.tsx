"use client";

import { useAuth } from "@/lib/auth-context";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      // Fetch all recent notifications (not just unread)
      const response = await fetch("/api/notifications?limit=10");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.slice(0, 10)); // Show 10 most recent notifications
        // Count only unread notifications for the badge
        const unread = data.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (response.ok) {
        setUnreadCount(0);
        // Refresh notifications to show them as read
        fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  const handleDropdownOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      // When dropdown opens and there are unread notifications, mark them as read
      handleMarkAllAsRead();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "leave_request":
      case "leave_approved":
      case "leave_rejected":
        return "📅";
      case "fine_approved":
      case "fine_waived":
        return "💰";
      case "incentive_awarded":
        return "🎉";
      case "attendance_alert":
        return "⏰";
      default:
        return "📢";
    }
  };

  return (
    <header
      className="sticky top-0 z-40 border-b border-[#00b576]"
      style={{
        backgroundColor: "#1a2937",
        borderColor: "rgba(0, 181, 118, 0.2)",
      }}
    >
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-[#00b576] via-transparent to-transparent" />
      </div>

      <div className="flex items-center justify-between px-6 py-3 relative ">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-64 pl-8 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00b576]"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </div>

          {/* Notifications */}
          <DropdownMenu onOpenChange={handleDropdownOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-gray-800 text-gray-300 hover:text-[#00b576]"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-[#00b576] text-white border-0">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 bg-[#1a2937] border-gray-700"
            >
              <DropdownMenuLabel className="flex items-center justify-between py-3 text-white">
                <span className="font-bold">Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="text-xs bg-[#00b576]/20 text-[#00b576] border border-[#00b576]">
                    {unreadCount} new
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">
                  No new notifications
                </div>
              ) : (
                <>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-800 border-b border-gray-700/50 focus:bg-gray-800 ${
                          !notification.isRead ? "bg-gray-800/50" : ""
                        }`}
                      >
                        <span className="text-lg">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#00b576] text-white">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              { addSuffix: true },
                            )}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/notifications"
                      className="w-full text-center text-sm font-medium py-3 text-[#00b576] hover:text-[#00b576] focus:text-[#00b576]"
                    >
                      View all notifications →
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
