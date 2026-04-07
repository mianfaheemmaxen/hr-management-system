import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Migrating from Paternity Leave to Umrah Leave...\n");

  try {
    // Step 1: Count existing paternity leave balances
    const paternityBalanceCount = await prisma.leaveBalance.count({
      where: {
        leaveType: "paternity",
      },
    });

    console.log(`📊 Found ${paternityBalanceCount} paternity leave balance records`);

    // Step 2: Count existing paternity leave requests
    const paternityRequestCount = await prisma.leaveRequest.count({
      where: {
        leaveType: "paternity",
      },
    });

    console.log(`📊 Found ${paternityRequestCount} paternity leave request records`);

    if (paternityBalanceCount === 0 && paternityRequestCount === 0) {
      console.log("\n✅ No paternity leave records found. System is already clean!");
      return;
    }

    console.log("\n🗑️  Removing paternity leave records...\n");

    // Step 3: Delete all paternity leave balances
    if (paternityBalanceCount > 0) {
      const balanceResult = await prisma.leaveBalance.deleteMany({
        where: {
          leaveType: "paternity",
        },
      });
      console.log(`✅ Removed ${balanceResult.count} paternity leave balance records`);
    }

    // Step 4: Delete all paternity leave requests
    if (paternityRequestCount > 0) {
      const requestResult = await prisma.leaveRequest.deleteMany({
        where: {
          leaveType: "paternity",
        },
      });
      console.log(`✅ Removed ${requestResult.count} paternity leave request records`);
    }

    console.log("\n📋 Summary:");
    console.log(`   - Paternity leave balances removed: ${paternityBalanceCount}`);
    console.log(`   - Paternity leave requests removed: ${paternityRequestCount}`);
    console.log(`   - Total records removed: ${paternityBalanceCount + paternityRequestCount}`);
    console.log("\n✨ Migration complete! Paternity leave has been removed from the system.");
    console.log("   Umrah leave is now available in the system.");
    console.log("\n💡 Next steps:");
    console.log("   1. Run database migration: npx prisma migrate dev");
    console.log("   2. Go to Settings → Leave Quotas and set Umrah Leave quota");
    console.log("   3. Use 'Bulk Assign Leave Quotas' to assign Umrah leave to employees");

  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

