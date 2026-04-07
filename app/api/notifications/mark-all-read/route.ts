import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logNotificationEvent } from "@/lib/audit-logger";

// POST mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get count of unread notifications before marking as read
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // Log the action
    await logNotificationEvent({
      action: "UPDATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      context: {
        action: "mark_all_as_read",
        count: unreadCount,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT mark all notifications as read (legacy support)
export async function PUT(request: NextRequest) {
  return POST(request);
}

