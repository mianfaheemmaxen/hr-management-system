import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking SystemSettings...");
    
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    if (settings) {
      console.log("✅ SystemSettings found:");
      console.log(JSON.stringify(settings, null, 2));
    } else {
      console.log("❌ No SystemSettings found");
    }
  } catch (error) {
    console.error("❌ Error:", error);
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

