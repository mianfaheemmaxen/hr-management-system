import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

// GET audit logs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super_admin can view audit logs (stricter access)
    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden - Super Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Filter parameters
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    const exportFormat = searchParams.get("export"); // csv, excel

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (action) {
      whereClause.action = action;
    }

    if (entityType) {
      whereClause.entityType = entityType;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    if (search) {
      whereClause.OR = [
        { description: { contains: search } },
        { userName: { contains: search } },
        { userEmail: { contains: search } },
        { entityId: { contains: search } },
      ];
    }

    // Handle export
    if (exportFormat) {
      const allLogs = await prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      const exportData = allLogs.map((log, index) => ({
        "Sr. #": index + 1,
        "Date & Time": new Date(log.createdAt).toLocaleString(),
        "User": log.userName || (log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"),
        "Email": log.userEmail || log.user?.email || "-",
        "Action": log.action,
        "Entity Type": log.entityType,
        "Entity ID": log.entityId || "-",
        "Description": log.description || "-",
        "IP Address": log.ipAddress || "-",
      }));

      if (exportFormat === "csv") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(ws);

        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=audit-logs-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      } else if (exportFormat === "excel") {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        ws["!cols"] = [
          { wch: 8 },   // Sr. #
          { wch: 20 },  // Date & Time
          { wch: 25 },  // User
          { wch: 30 },  // Email
          { wch: 15 },  // Action
          { wch: 15 },  // Entity Type
          { wch: 25 },  // Entity ID
          { wch: 50 },  // Description
          { wch: 15 },  // IP Address
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=audit-logs-${new Date().toISOString().split("T")[0]}.xlsx`,
          },
        });
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.auditLog.count({ where: whereClause });

    // Fetch paginated results
    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: auditLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + auditLogs.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


