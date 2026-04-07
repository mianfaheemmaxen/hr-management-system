import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAttendanceEvent } from "@/lib/audit-logger";

// GET attendance records
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const scope = searchParams.get("scope"); // 'team' or 'own'

    const where: Record<string, unknown> = {};

    if (date) {
      // Parse date as UTC to avoid timezone issues
      where.date = new Date(date + 'T00:00:00.000Z');
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    // Role-based filtering
    const userRole = session.user.role;

    // If not super_admin or hr_manager, apply role-based restrictions
    if (!["super_admin", "hr_manager"].includes(userRole)) {
      // Get the current user's employee record
      const currentEmployee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!currentEmployee) {
        return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
      }

      if (userRole === "manager") {
        // For managers, check the scope parameter
        if (scope === "own") {
          // Show only their own attendance
          where.employeeId = currentEmployee.id;
        } else {
          // Show team attendance (subordinates)
          const subordinates = await prisma.employee.findMany({
            where: { managerId: currentEmployee.id, status: "active" },
            select: { id: true },
          });

          const subordinateIds = subordinates.map(s => s.id);

          // If employeeId is specified, make sure it's a subordinate
          if (employeeId) {
            if (!subordinateIds.includes(employeeId)) {
              return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
            }
          } else {
            // Show all subordinates' attendance
            where.employeeId = { in: subordinateIds };
          }
        }
      } else {
        // For regular employees, show only their own attendance
        where.employeeId = currentEmployee.id;
      }
    }

    const attendance = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
            department: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const transformed = attendance.map((record) => ({
      id: record.id,
      employeeId: record.employeeId,
      employeeName: `${record.employee.user.firstName} ${record.employee.user.lastName}`,
      department: record.employee.department?.name || "",
      date: record.date.toISOString().split("T")[0],
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status,
      lateMinutes: record.lateMinutes,
      isCompensated: record.isCompensated,
      intimated: record.intimated,
      intimatedReason: record.intimatedReason,
      notes: record.notes,
      source: record.source,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST create/update attendance
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { records } = body;

    // Bulk upsert attendance records
    const results = await Promise.all(
      records.map(async (record: {
        employeeId: string;
        date: string;
        checkIn?: string;
        checkOut?: string;
        status: string;
        lateMinutes?: number;
        notes?: string;
        source?: string;
      }) => {
        return prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: record.employeeId,
              date: new Date(record.date),
            },
          },
          create: {
            employeeId: record.employeeId,
            date: new Date(record.date),
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            status: record.status,
            lateMinutes: record.lateMinutes || 0,
            notes: record.notes,
            source: record.source || "manual",
          },
          update: {
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            status: record.status,
            lateMinutes: record.lateMinutes || 0,
            notes: record.notes,
            source: record.source || "manual",
          },
        });
      })
    );

    // Log attendance bulk update
    await logAttendanceEvent({
      action: "BULK_UPDATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      context: {
        recordCount: results.length,
        date: records[0]?.date,
        source: records[0]?.source || "manual",
      },
    });

    return NextResponse.json({ count: results.length });
  } catch (error) {
    console.error("Error creating attendance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

