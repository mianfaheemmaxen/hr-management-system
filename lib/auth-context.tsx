"use client";

import React, { createContext, useContext } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  employeeId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role-based permissions
const rolePermissions: Record<string, string[]> = {
  super_admin: [
    'view_all_employees',
    'manage_employees',
    'view_all_attendance',
    'manage_attendance',
    'view_all_leaves',
    'manage_leaves',
    'approve_leaves_final',
    'approve_all_leaves',
    'view_all_fines',
    'manage_fines',
    'view_all_incentives',
    'manage_incentives',
    'view_reports',
    'manage_settings',
    'manage_users',
    'manage_roles',
    'view_audit_logs',
    'super_admin_only',
  ],
  hr_manager: [
    'view_all_employees',
    'manage_employees',
    'view_all_attendance',
    'manage_attendance',
    'view_all_leaves',
    'manage_leaves',
    'approve_leaves_final',
    'approve_all_leaves',
    'view_all_fines',
    'manage_fines',
    'view_all_incentives',
    'manage_incentives',
    'view_reports',
    'view_audit_logs',
  ],
  manager: [
    'view_team_employees',
    'view_team_attendance',
    'view_team_leaves',
    'approve_leaves_manager',
    'view_team_fines',
    'manage_team_fines',
    'view_team_incentives',
    'manage_team_incentives',
    'view_team_reports',
  ],
  employee: [
    'view_own_attendance',
    'view_own_leaves',
    'apply_leave',
    'view_own_fines',
    'view_own_incentives',
    'check_in_out',
  ],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  const user: AuthUser | null = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    role: session.user.role,
    employeeId: session.user.employeeId,
  } : null;

  const logout = async () => {
    // Log the logout event before signing out
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Failed to log logout event:', error);
    }
    await signOut({ callbackUrl: '/login' });
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, logout, isLoading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

