"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  MapPin,
  Edit,
  ArrowLeft,
  Shield,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface EmployeeProfile {
  id: string;
  employeeId: string;
  odooEmployeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  departmentId: string;
  designation: string;
  managerId: string | null;
  managerName: string | null;
  role: string;
  status: string;
  dateOfJoining: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.employeeId) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/employees/${user?.employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-[#1a2937] text-white hover:bg-[#1a2937]/90";
      case "hr_manager":
        return "bg-[#00b576]/20 text-[#00b576] hover:bg-[#00b576]/30 border border-[#00b576]/30";
      case "manager":
        return "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200";
    }
  };

  const canEditProfile = user?.role === "super_admin" || user?.role === "hr_manager";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-linear-to-br from-[#00b576]/5 to-[#1a2937]/5">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#00b576]/20 border-t-[#00b576]"></div>
          <div className="absolute inset-0 animate-pulse rounded-full h-16 w-16 border-4 border-[#1a2937]/10"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#00b576]/5 to-[#1a2937]/5">
        <Header title="My Profile" description="View your profile information" />
        <div className="p-6">
          <Card className="border-[#00b576]/20 shadow-lg transition-shadow duration-300 hover:shadow-xl">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No employee profile found. Please contact HR to set up your profile.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#00b576]/5 via-white to-[#1a2937]/5">
      <Header
        title="My Profile"
        description="View and manage your profile information"
      />

      <div className="p-6 space-y-6">
        {/* Profile Header Card */}
        <Card className="border-none shadow-xl transition-all duration-300 hover:shadow-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                <Avatar className="h-28 w-28 border-4 border-white shadow-xl transition-transform duration-300 group-hover:scale-105">
                  <AvatarFallback className="text-3xl font-bold bg-linear-to-br from-[#00b576] to-[#1a2937] text-white">
                    {getInitials(profile.firstName, profile.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-linear-to-br from-[#00b576] to-[#00b576]/80 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform duration-300 group-hover:scale-110">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-bold bg-linear-to-r from-[#1a2937] to-[#00b576] bg-clip-text text-transparent">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <Badge className={`${getRoleBadgeColor(profile.role)} transition-all duration-200`}>
                    {profile.role.replace("_", " ").toUpperCase()}
                  </Badge>
                  <Badge 
                    className={`transition-all duration-200 ${
                      profile.status === "active" 
                        ? "bg-[#00b576]/20 text-[#00b576] border-[#00b576]/30" 
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {profile.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-semibold text-[#1a2937]">{profile.designation}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00b576] animate-pulse"></span>
                    Employee ID: <span className="font-mono font-semibold text-[#1a2937]">{profile.employeeId}</span>
                  </p>
                </div>
              </div>

              {canEditProfile && (
                <Link href={`/employees/${profile.id}/edit`}>
                  <Button className="bg-linear-to-r from-[#00b576] to-[#00b576]/90 hover:from-[#00b576]/90 hover:to-[#00b576] text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information Card */}
          <Card className="border-[#00b576]/20 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[#00b576]/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-[#1a2937]">
                <div className="p-2 bg-linear-to-rr from-[#00b576]/20 to-[#00b576]/10 rounded-lg transition-transform duration-300 hover:scale-110">
                  <User className="h-5 w-5 text-[#00b576]" />
                </div>
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#00b576]/5 transition-all duration-200 hover:translate-x-1">
                <div className="p-2 bg-[#00b576]/10 rounded-lg transition-transform duration-200 hover:scale-110">
                  <Mail className="h-4 w-4 text-[#00b576]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1a2937] mb-1">Email Address</p>
                  <p className="text-sm text-muted-foreground break-all">{profile.email}</p>
                </div>
              </div>

              {profile.phone && (
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#00b576]/5 transition-all duration-200 hover:translate-x-1">
                  <div className="p-2 bg-[#00b576]/10 rounded-lg transition-transform duration-200 hover:scale-110">
                    <Phone className="h-4 w-4 text-[#00b576]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1a2937] mb-1">Phone Number</p>
                    <p className="text-sm text-muted-foreground">{profile.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#00b576]/5 transition-all duration-200 hover:translate-x-1">
                <div className="p-2 bg-[#00b576]/10 rounded-lg transition-transform duration-200 hover:scale-110">
                  <User className="h-4 w-4 text-[#00b576]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1a2937] mb-1">Employee Code</p>
                  <p className="text-sm text-muted-foreground font-mono">{profile.odooEmployeeId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Information Card */}
          <Card className="border-[#1a2937]/20 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[#1a2937]/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-[#1a2937]">
                <div className="p-2 bg-linear-to-br from-[#1a2937]/20 to-[#1a2937]/10 rounded-lg transition-transform duration-300 hover:scale-110">
                  <Briefcase className="h-5 w-5 text-[#1a2937]" />
                </div>
                Employment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#1a2937]/5 transition-all duration-200 hover:translate-x-1">
                <div className="p-2 bg-[#1a2937]/10 rounded-lg transition-transform duration-200 hover:scale-110">
                  <Building2 className="h-4 w-4 text-[#1a2937]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1a2937] mb-1">Department</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.department || "Not assigned"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#1a2937]/5 transition-all duration-200 hover:translate-x-1">
                <div className="p-2 bg-[#1a2937]/10 rounded-lg transition-transform duration-200 hover:scale-110">
                  <Briefcase className="h-4 w-4 text-[#1a2937]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1a2937] mb-1">Designation</p>
                  <p className="text-sm text-muted-foreground">{profile.designation}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#1a2937]/5 transition-all duration-200 hover:translate-x-1">
                <div className="p-2 bg-[#1a2937]/10 rounded-lg transition-transform duration-200 hover:scale-110">
                  <Calendar className="h-4 w-4 text-[#1a2937]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1a2937] mb-1">Date of Joining</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(profile.dateOfJoining), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              {profile.managerName && (
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#1a2937]/5 transition-all duration-200 hover:translate-x-1">
                  <div className="p-2 bg-[#1a2937]/10 rounded-lg transition-transform duration-200 hover:scale-110">
                    <User className="h-4 w-4 text-[#1a2937]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1a2937] mb-1">Reports To</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.managerName}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


