import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logSettingsEvent } from "@/lib/audit-logger";

// GET system settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      // Create default settings with default fine rules
      const defaultFineRules = [
        { minMinutes: 1, maxMinutes: 15, amount: 50 },
        { minMinutes: 16, maxMinutes: 30, amount: 100 },
        { minMinutes: 31, maxMinutes: 60, amount: 200 },
        { minMinutes: 61, maxMinutes: null, amount: 500 },
      ];

      settings = await prisma.systemSettings.create({
        data: {
          id: "default",
          fineRules: JSON.stringify(defaultFineRules),
        },
      });
    }

    // Parse fineRules from JSON string
    let fineRules = [];
    try {
      fineRules = settings.fineRules ? JSON.parse(settings.fineRules) : [];
    } catch (e) {
      console.error("Error parsing fineRules:", e);
      fineRules = [];
    }

    // Parse dailyTimings from JSON string
    let dailyTimings = null;
    try {
      dailyTimings = settings.dailyTimings ? JSON.parse(settings.dailyTimings) : null;
    } catch (e) {
      console.error("Error parsing dailyTimings:", e);
      dailyTimings = null;
    }

    return NextResponse.json({
      ...settings,
      fineRules,
      dailyTimings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      companyName,
      graceMinutes,
      workingDaysPerWeek,
      punctualityIncentiveAmount,
      sickLeaveQuota,
      annualLeaveQuota,
      complementaryLeaveQuota,
      unpaidLeaveQuota,
      maternityLeaveQuota,
      fineRules,
      dailyTimings,
    } = body;

    // Get current settings for comparison
    const currentSettings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    await prisma.systemSettings.update({
      where: { id: "default" },
      data: {
        companyName,
        graceMinutes,
        workingDaysPerWeek,
        punctualityIncentiveAmount,
        sickLeaveQuota,
        annualLeaveQuota,
        complementaryLeaveQuota,
        unpaidLeaveQuota,
        maternityLeaveQuota,
        fineRules: JSON.stringify(fineRules),
        dailyTimings: dailyTimings ? JSON.stringify(dailyTimings) : null,
      },
    });

    // Log settings update
    await logSettingsEvent({
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      oldValue: currentSettings ? {
        companyName: currentSettings.companyName,
        graceMinutes: currentSettings.graceMinutes,
        workingDaysPerWeek: currentSettings.workingDaysPerWeek,
        punctualityIncentiveAmount: currentSettings.punctualityIncentiveAmount,
        sickLeaveQuota: currentSettings.sickLeaveQuota,
        annualLeaveQuota: currentSettings.annualLeaveQuota,
        complementaryLeaveQuota: currentSettings.complementaryLeaveQuota,
        unpaidLeaveQuota: currentSettings.unpaidLeaveQuota,
        maternityLeaveQuota: currentSettings.maternityLeaveQuota,
      } : null,
      newValue: {
        companyName,
        graceMinutes,
        workingDaysPerWeek,
        punctualityIncentiveAmount,
        sickLeaveQuota,
        annualLeaveQuota,
        complementaryLeaveQuota,
        unpaidLeaveQuota,
        maternityLeaveQuota,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

