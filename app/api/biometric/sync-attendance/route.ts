import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { biometricSyncService } from "@/lib/biometric/sync-service";
import { logBiometricEvent } from "@/lib/audit-logger";

// POST - Manually trigger attendance sync
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only super_admin and hr_manager can trigger sync
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const date = body.date ? new Date(body.date) : new Date();

    console.log(`[API] Attendance sync triggered by ${session.user.email} for date ${date.toISOString()}`);

    const result = await biometricSyncService.syncAttendance(date);

    // Log the sync event
    await logBiometricEvent({
      action: "SYNC",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      syncType: "attendance",
      context: {
        date: date.toISOString().split("T")[0],
        synced: result.synced,
        success: result.success,
        errorCount: result.errors.length,
      },
    });

    return NextResponse.json({
      success: result.success,
      message: `Synced ${result.synced} attendance records`,
      synced: result.synced,
      errors: result.errors
    });
  } catch (error) {
    console.error("Error in attendance sync API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get sync status/info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return info about biometric integration
    return NextResponse.json({
      status: "active",
      syncFrequency: "Every 5 minutes",
      lastSync: "Not implemented yet", // TODO: Store last sync time in database
    });
  } catch (error) {
    console.error("Error in attendance sync status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

