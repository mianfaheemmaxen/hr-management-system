import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { biometricService } from "@/lib/biometric/biometric-service";
import prisma from "@/lib/prisma";

// GET - Fetch employees from biometric system
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only authenticated users with manage_employees permission can access
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "100");

    const result = await biometricService.fetchEmployees(page, pageSize);

    // Get all linked biometric IDs (emp_code) from our database
    const linkedEmployees = await prisma.employee.findMany({
      where: {
        biometricId: {
          not: null
        }
      },
      select: {
        biometricId: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Create a map of linked biometric IDs (emp_code)
    const linkedBiometricIds = new Set(linkedEmployees.map(emp => emp.biometricId));
    const linkedBiometricMap = new Map(
      linkedEmployees.map(emp => [
        emp.biometricId,
        `${emp.user.firstName} ${emp.user.lastName}`
      ])
    );

    // Transform to simpler format for dropdown with linked status
    // IMPORTANT: Use emp_code as the id value since that's what the attendance API returns
    const employees = result.data.map(emp => ({
      id: emp.emp_code,  // Use emp_code for matching with attendance sync
      empCode: emp.emp_code,
      name: emp.full_name || `${emp.first_name} ${emp.last_name || ''}`.trim(),
      department: emp.department?.dept_name || '',
      position: emp.position?.position_name || '',
      isLinked: linkedBiometricIds.has(emp.emp_code),
      linkedTo: linkedBiometricMap.get(emp.emp_code) || null
    }));

    return NextResponse.json({
      employees,
      total: result.count,
      hasMore: result.next !== null
    });
  } catch (error) {
    console.error("Error fetching biometric employees:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch biometric employees" },
      { status: 500 }
    );
  }
}

