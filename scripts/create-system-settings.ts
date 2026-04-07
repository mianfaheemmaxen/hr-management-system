import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating default SystemSettings...");

  const defaultFineRules = [
    { minMinutes: 1, maxMinutes: 15, amount: 50 },
    { minMinutes: 16, maxMinutes: 30, amount: 100 },
    { minMinutes: 31, maxMinutes: 60, amount: 200 },
    { minMinutes: 61, maxMinutes: null, amount: 500 },
  ];

  const defaultDailyTimings = {
    monday: { startTime: "09:00", endTime: "18:00", isOffDay: false },
    tuesday: { startTime: "09:00", endTime: "18:00", isOffDay: false },
    wednesday: { startTime: "09:00", endTime: "18:00", isOffDay: false },
    thursday: { startTime: "09:00", endTime: "18:00", isOffDay: false },
    friday: { startTime: "09:00", endTime: "18:00", isOffDay: false },
    saturday: { startTime: "09:00", endTime: "14:00", isOffDay: false },
    sunday: { startTime: "09:00", endTime: "18:00", isOffDay: true },
  };

  const settings = await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "HR Portal",
      graceMinutes: 15,
      workingDaysPerWeek: 6,
      punctualityIncentiveAmount: 5000,
      annualLeaveQuota: 15,
      sickLeaveQuota: 12,
      complementaryLeaveQuota: 5,
      unpaidLeaveQuota: 0,
      maternityLeaveQuota: 180,
      umrahLeaveQuota: 15,
      fineRules: JSON.stringify(defaultFineRules),
      dailyTimings: JSON.stringify(defaultDailyTimings),
    },
  });

  console.log("✅ SystemSettings created successfully!");
  console.log(JSON.stringify(settings, null, 2));
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

