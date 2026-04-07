import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating admin user...");

  const adminPassword = await hash("admin123", 12);

  // Create Engineering department first
  const department = await prisma.department.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", description: "Software Engineering Team" },
  });

  // Create Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      password: adminPassword,
      firstName: "System",
      lastName: "Admin",
      role: "super_admin",
      employee: {
        create: {
          employeeCode: "EMP001",
          phone: "+1234567890",
          departmentId: department.id,
          designation: "System Administrator",
          dateOfJoining: new Date("2020-01-01"),
          employmentType: "full_time",
          employmentStatus: "permanent",
        },
      },
    },
  });

  console.log("✅ Admin user created successfully!");
  console.log("Email: admin@company.com");
  console.log("Password: admin123");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

