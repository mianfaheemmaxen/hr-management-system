import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSchedulerStatus, runEmployeeSyncNow, runAttendanceSyncNow } from "@/lib/biometric/scheduler";

// GET - Get scheduler status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = getSchedulerStatus();
    
    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("Error getting scheduler status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Manually trigger sync
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'employee' or 'attendance'

    if (action === 'employee') {
      console.log(`[API] Manual employee sync triggered by ${session.user.email}`);
      const result = await runEmployeeSyncNow();
      return NextResponse.json({
        success: result.success,
        message: `Employee sync completed: ${result.synced} synced`,
        synced: result.synced,
        errors: result.errors,
      });
    } else if (action === 'attendance') {
      console.log(`[API] Manual attendance sync triggered by ${session.user.email}`);
      const result = await runAttendanceSyncNow();
      return NextResponse.json({
        success: result.success,
        message: `Attendance sync completed: ${result.synced} synced`,
        synced: result.synced,
        errors: result.errors,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'employee' or 'attendance'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in manual sync:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

