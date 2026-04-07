import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAuthEvent } from "@/lib/audit-logger";

// POST - Log logout event before signOut
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      await logAuthEvent({
        action: "LOGOUT",
        userId: session.user.id,
        userEmail: session.user.email,
        userName: `${session.user.firstName} ${session.user.lastName}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging logout:", error);
    // Still return success - we don't want to block logout due to logging failure
    return NextResponse.json({ success: true });
  }
}

