import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logDepartmentEvent } from "@/lib/audit-logger";

// GET all departments
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        parentDepartment: {
          select: {
            id: true,
            name: true,
          },
        },
        childDepartments: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    // Transform the response to include childDepartmentsCount
    const transformedDepartments = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      isActive: dept.isActive,
      parentDepartmentId: dept.parentDepartmentId,
      parentDepartment: dept.parentDepartment,
      childDepartmentsCount: dept.childDepartments.length,
      _count: dept._count,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
    }));

    return NextResponse.json(transformedDepartments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to check for circular references
async function hasCircularReference(departmentId: string, parentId: string): Promise<boolean> {
  let currentId: string | null = parentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === departmentId) {
      return true; // Circular reference detected
    }
    if (visited.has(currentId)) {
      return true; // Loop detected
    }
    visited.add(currentId);

    const parent: { parentDepartmentId: string | null } | null = await prisma.department.findUnique({
      where: { id: currentId },
      select: { parentDepartmentId: true },
    });

    currentId = parent?.parentDepartmentId || null;
  }

  return false;
}

// POST create new department
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission (HR Manager or Super Admin)
    if (!["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, parentDepartmentId } = body;

    if (!name) {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 });
    }

    // Check if department already exists
    const existing = await prisma.department.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json({ error: "Department already exists" }, { status: 400 });
    }

    // Validate parent department if provided
    if (parentDepartmentId) {
      const parentDept = await prisma.department.findUnique({
        where: { id: parentDepartmentId },
      });

      if (!parentDept) {
        return NextResponse.json({ error: "Parent department not found" }, { status: 400 });
      }
    }

    const department = await prisma.department.create({
      data: {
        name,
        description: description || null,
        parentDepartmentId: parentDepartmentId || null,
      },
    });

    // Log department creation
    await logDepartmentEvent({
      action: "CREATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      departmentId: department.id,
      departmentName: name,
      newValue: { name, description, parentDepartmentId },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

