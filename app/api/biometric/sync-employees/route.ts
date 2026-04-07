import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { biometricSyncService } from "@/lib/biometric/sync-service";
import { logBiometricEvent } from "@/lib/audit-logger";

// POST - Manually trigger employee sync
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only super_admin and hr_manager can trigger sync
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[API] Employee sync triggered by ${session.user.email}`);

    const result = await biometricSyncService.syncEmployees();

    // Log the sync event
    await logBiometricEvent({
      action: "SYNC",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      syncType: "employees",
      context: {
        synced: result.synced,
        success: result.success,
        errorCount: result.errors.length,
      },
    });

    return NextResponse.json({
      success: result.success,
      message: `Synced ${result.synced} employees`,
      synced: result.synced,
      errors: result.errors
    });
  } catch (error) {
    console.error("Error in employee sync API:", error);
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
      syncFrequency: "Every 1 hour",
      lastSync: "Not implemented yet", // TODO: Store last sync time in database
    });
  } catch (error) {
    console.error("Error in employee sync status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

