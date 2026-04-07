import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logDepartmentEvent } from "@/lib/audit-logger";

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

// Helper function to get all descendant department IDs
async function getDescendantIds(departmentId: string): Promise<string[]> {
  const descendants: string[] = [];
  const queue = [departmentId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await prisma.department.findMany({
      where: { parentDepartmentId: currentId },
      select: { id: true },
    });

    for (const child of children) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}

// GET single department
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const department = await prisma.department.findUnique({
      where: { id },
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
          select: { employees: true },
        },
      },
    });

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Transform response
    const response = {
      ...department,
      childDepartmentsCount: department.childDepartments.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching department:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT update department
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission (HR Manager or Super Admin)
    if (!["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, isActive, parentDepartmentId } = body;

    // Get old department data for audit log
    const oldDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!oldDepartment) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Validate parent department changes
    if (parentDepartmentId !== undefined) {
      // Cannot set itself as parent
      if (parentDepartmentId === id) {
        return NextResponse.json(
          { error: "A department cannot be its own parent" },
          { status: 400 }
        );
      }

      // Check for circular references
      if (parentDepartmentId) {
        const hasCircular = await hasCircularReference(id, parentDepartmentId);
        if (hasCircular) {
          return NextResponse.json(
            { error: "This would create a circular reference in the department hierarchy" },
            { status: 400 }
          );
        }

        // Validate parent exists
        const parentDept = await prisma.department.findUnique({
          where: { id: parentDepartmentId },
        });

        if (!parentDept) {
          return NextResponse.json({ error: "Parent department not found" }, { status: 400 });
        }

        // Cannot set a child department as parent
        const descendants = await getDescendantIds(id);
        if (descendants.includes(parentDepartmentId)) {
          return NextResponse.json(
            { error: "Cannot set a child department as parent" },
            { status: 400 }
          );
        }
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(parentDepartmentId !== undefined && { parentDepartmentId: parentDepartmentId || null }),
      },
    });

    // Log department update
    await logDepartmentEvent({
      action: "UPDATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      departmentId: id,
      departmentName: department.name,
      oldValue: {
        name: oldDepartment.name,
        description: oldDepartment.description,
        isActive: oldDepartment.isActive,
        parentDepartmentId: oldDepartment.parentDepartmentId,
      },
      newValue: {
        name: department.name,
        description: department.description,
        isActive: department.isActive,
        parentDepartmentId: department.parentDepartmentId,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE department
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission (Super Admin only)
    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "You dont have permission to delete departments contact System Admin." }, { status: 403 });
    }

    const { id } = await params;

    // Check if department has employees or child departments
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        childDepartments: {
          select: { id: true },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    if (department._count.employees > 0) {
      return NextResponse.json(
        { error: "Cannot delete department with employees" },
        { status: 400 }
      );
    }

    if (department.childDepartments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete department with subdepartments. Please reassign or delete subdepartments first." },
        { status: 400 }
      );
    }

    await prisma.department.delete({
      where: { id },
    });

    // Log department deletion
    await logDepartmentEvent({
      action: "DELETE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      departmentId: id,
      departmentName: department.name,
      context: {
        description: department.description,
        isActive: department.isActive,
      },
    });

    return NextResponse.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

