import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Checking and fixing Umrah leave quota...\n");

  try {
    // Get current settings
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      console.log("❌ No system settings found!");
      return;
    }

    console.log("📊 Current Leave Quotas:");
    console.log(`   - Sick Leave: ${settings.sickLeaveQuota} days`);
    console.log(`   - Annual Leave: ${settings.annualLeaveQuota} days`);
    console.log(`   - Complementary Leave: ${settings.complementaryLeaveQuota} days`);
    console.log(`   - Unpaid Leave: ${settings.unpaidLeaveQuota} days`);
    console.log(`   - Maternity Leave: ${settings.maternityLeaveQuota} days`);
    console.log(`   - Umrah Leave: ${settings.umrahLeaveQuota} days`);

    // Check if umrahLeaveQuota is 0 or null
    if (!settings.umrahLeaveQuota || settings.umrahLeaveQuota === 0) {
      console.log("\n⚠️  Umrah leave quota is 0 or not set. Setting to 15 days...");
      
      await prisma.systemSettings.update({
        where: { id: "default" },
        data: { umrahLeaveQuota: 15 },
      });

      console.log("✅ Umrah leave quota set to 15 days!");
    } else {
      console.log(`\n✅ Umrah leave quota is already set to ${settings.umrahLeaveQuota} days`);
    }

    // Check for any paternity leave balances that need to be removed
    const paternityBalances = await prisma.leaveBalance.count({
      where: { leaveType: "paternity" },
    });

    if (paternityBalances > 0) {
      console.log(`\n⚠️  Found ${paternityBalances} paternity leave balances. Removing...`);
      
      const result = await prisma.leaveBalance.deleteMany({
        where: { leaveType: "paternity" },
      });

      console.log(`✅ Removed ${result.count} paternity leave balances`);
    } else {
      console.log("\n✅ No paternity leave balances found (clean!)");
    }

    // Check for any paternity leave requests
    const paternityRequests = await prisma.leaveRequest.count({
      where: { leaveType: "paternity" },
    });

    if (paternityRequests > 0) {
      console.log(`\n⚠️  Found ${paternityRequests} paternity leave requests. Removing...`);
      
      const result = await prisma.leaveRequest.deleteMany({
        where: { leaveType: "paternity" },
      });

      console.log(`✅ Removed ${result.count} paternity leave requests`);
    } else {
      console.log("✅ No paternity leave requests found (clean!)");
    }

    // Check for any unpaid leave balances (we don't need these either)
    const unpaidBalances = await prisma.leaveBalance.count({
      where: { leaveType: "unpaid" },
    });

    if (unpaidBalances > 0) {
      console.log(`\n⚠️  Found ${unpaidBalances} unpaid leave balances. Removing (unpaid is unlimited)...`);
      
      const result = await prisma.leaveBalance.deleteMany({
        where: { leaveType: "unpaid" },
      });

      console.log(`✅ Removed ${result.count} unpaid leave balances`);
    }

    console.log("\n✨ Done! System is ready for Umrah leave.");
    console.log("\n💡 Next steps:");
    console.log("   1. Restart your Next.js dev server");
    console.log("   2. Go to Settings → Leave Quotas");
    console.log("   3. Click 'Bulk Assign Leave Quotas' to assign Umrah leave to employees");

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

