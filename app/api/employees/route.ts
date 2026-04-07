import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logEmployeeEvent } from "@/lib/audit-logger";

// GET all employees
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope"); // 'team' for direct reports only

    // Build query based on role
    let whereClause = {};

    // If employee, return only their own record
    if (session.user.role === "employee") {
      whereClause = { userId: session.user.id };
    }
    // If manager, filter based on scope
    else if (session.user.role === "manager") {
      const managerEmployee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
        select: { id: true, departmentId: true },
      });

      if (scope === "team") {
        // Return only direct reports (subordinates)
        whereClause = { managerId: managerEmployee?.id };
      } else if (scope === "own") {
        // Return only manager's own record
        whereClause = { userId: session.user.id };
      } else if (managerEmployee?.departmentId) {
        // Return all employees from their department (default behavior)
        whereClause = { departmentId: managerEmployee.departmentId };
      }
    }
    // HR and Super Admin see all employees (no where clause needed)

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        },
        department: true,
        manager: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Transform to match frontend expectations
    const transformedEmployees = employees.map((emp) => ({
      id: emp.id,
      userId: emp.userId,
      odooEmployeeId: emp.employeeCode,
      firstName: emp.user.firstName,
      lastName: emp.user.lastName,
      email: emp.user.email,
      phone: emp.phone || "",
      department: emp.department?.name || "",
      departmentId: emp.departmentId,
      designation: emp.designation || "",
      managerId: emp.managerId,
      managerName: emp.manager ? `${emp.manager.user.firstName} ${emp.manager.user.lastName}` : null,
      role: emp.user.role,
      status: emp.status,
      employmentStatus: emp.employmentStatus,
      dateOfJoining: emp.dateOfJoining.toISOString().split("T")[0],
      employeeId: emp.employeeCode,
      gender: emp.gender || null,
      dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.toISOString().split("T")[0] : null,
      nationality: emp.nationality || null,
      probationCompleteDate: emp.probationCompleteDate ? emp.probationCompleteDate.toISOString().split("T")[0] : null,
      emergencyContactName: emp.emergencyContactName || null,
      emergencyContactNumber: emp.emergencyContactNumber || null,
      emergencyContactRelation: emp.emergencyContactRelation || null,
      cnicNumber: emp.cnicNumber || null,
      passportNumber: emp.passportNumber || null,
    }));

    return NextResponse.json(transformedEmployees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST create employee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      firstName, lastName, email, password, phone, departmentId, designation, managerId, role,
      dateOfJoining, employeeCode, biometricId, employmentStatus, gender,
      dateOfBirth, nationality, probationCompleteDate, emergencyContactName,
      emergencyContactNumber, emergencyContactRelation, cnicNumber, passportNumber
    } = body;

    // Hash password
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(password || "password123", 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "employee",
        employee: {
          create: {
            employeeCode,
            biometricId: biometricId || null,
            phone,
            departmentId: departmentId || null,
            designation,
            managerId: managerId || null,
            dateOfJoining: new Date(dateOfJoining),
            employmentStatus: employmentStatus || "probation",
            gender: gender || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            nationality: nationality || null,
            probationCompleteDate: probationCompleteDate ? new Date(probationCompleteDate) : null,
            emergencyContactName: emergencyContactName || null,
            emergencyContactNumber: emergencyContactNumber || null,
            emergencyContactRelation: emergencyContactRelation || null,
            cnicNumber: cnicNumber || null,
            passportNumber: passportNumber || null,
          },
        },
      },
      include: {
        employee: true,
      },
    });

    // Log employee creation
    await logEmployeeEvent({
      action: "CREATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      employeeId: user.employee?.id || "",
      employeeName: `${firstName} ${lastName}`,
      newValue: {
        email,
        firstName,
        lastName,
        role: role || "employee",
        employeeCode,
        departmentId,
        designation,
        managerId,
        dateOfJoining,
        employmentStatus: employmentStatus || "probation",
        gender,
      },
    });

    return NextResponse.json({ id: user.employee?.id, userId: user.id });
  } catch (error: unknown) {
    console.error("Error creating employee:", error);

    // Check for unique constraint violation (duplicate email)
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json({ error: "An employee with this email already exists" }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

