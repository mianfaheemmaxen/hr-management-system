import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { name: "Engineering" },
      update: {},
      create: { name: "Engineering", description: "Software Engineering Team" },
    }),
    prisma.department.upsert({
      where: { name: "Human Resources" },
      update: {},
      create: { name: "Human Resources", description: "HR Team" },
    }),
    prisma.department.upsert({
      where: { name: "Finance" },
      update: {},
      create: { name: "Finance", description: "Finance Team" },
    }),
    prisma.department.upsert({
      where: { name: "Marketing" },
      update: {},
      create: { name: "Marketing", description: "Marketing Team" },
    }),
  ]);

  console.log("✅ Departments created");

  // Create users with employees
  const adminPassword = await hash("admin123", 12);
  const hrPassword = await hash("hr123", 12);
  const managerPassword = await hash("manager123", 12);
  const employeePassword = await hash("employee123", 12);

  // Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@maxenpower.com" },
    update: {},
    create: {
      email: "admin@maxenpower.com",
      password: adminPassword,
      firstName: "System",
      lastName: "Admin",
      role: "super_admin",
      employee: {
        create: {
          employeeCode: "EMP001",
          phone: "+1234567890",
          departmentId: departments[0].id,
          designation: "System Administrator",
          dateOfJoining: new Date("2020-01-01"),
        },
      },
    },
  });

  // HR Manager
  const hrUser = await prisma.user.upsert({
    where: { email: "sarah.hr@maxenpower.com" },
    update: {},
    create: {
      email: "sarah.hr@maxenpower.com",
      password: hrPassword,
      firstName: "Sarah",
      lastName: "Johnson",
      role: "hr_manager",
      employee: {
        create: {
          employeeCode: "EMP003",
          phone: "+1234567892",
          departmentId: departments[1].id,
          designation: "HR Manager",
          dateOfJoining: new Date("2021-03-15"),
        },
      },
    },
  });

  // Tech Manager
  const techManagerUser = await prisma.user.upsert({
    where: { email: "john.tech@maxenpower.com" },
    update: {},
    create: {
      email: "john.tech@maxenpower.com",
      password: managerPassword,
      firstName: "John",
      lastName: "Smith",
      role: "manager",
      employee: {
        create: {
          employeeCode: "EMP002",
          phone: "+1234567891",
          departmentId: departments[0].id,
          designation: "Engineering Manager",
          dateOfJoining: new Date("2020-06-01"),
        },
      },
    },
  });

  // Get tech manager employee for subordinates
  const techManagerEmployee = await prisma.employee.findUnique({
    where: { userId: techManagerUser.id },
  });

  // Regular Employees
  const employees = [
    { email: "alice.dev@maxenpower.com", firstName: "Alice", lastName: "Brown", code: "EMP004", designation: "Senior Developer" },
    { email: "bob.dev@maxenpower.com", firstName: "Bob", lastName: "Wilson", code: "EMP005", designation: "Developer" },
    { email: "carol.dev@maxenpower.com", firstName: "Carol", lastName: "Davis", code: "EMP006", designation: "Junior Developer" },
    { email: "david.qa@maxenpower.com", firstName: "David", lastName: "Miller", code: "EMP007", designation: "QA Engineer" },
    { email: "eva.design@maxenpower.com", firstName: "Eva", lastName: "Taylor", code: "EMP008", designation: "UI Designer" },
  ];

  for (const emp of employees) {
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        password: employeePassword,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: "employee",
        employee: {
          create: {
            employeeCode: emp.code,
            departmentId: departments[0].id,
            designation: emp.designation,
            dateOfJoining: new Date("2022-01-15"),
            managerId: techManagerEmployee?.id,
          },
        },
      },
    });
  }

  console.log("✅ Users and employees created");

  // Create system settings
  const defaultFineRules = JSON.stringify([
    { minLateMinutes: 5, maxLateMinutes: 14, amount: 1000 },
    { minLateMinutes: 15, maxLateMinutes: 29, amount: 2000 },
    { minLateMinutes: 30, maxLateMinutes: 59, amount: 3000 },
    { minLateMinutes: 60, maxLateMinutes: 119, amount: 4000 },
    { minLateMinutes: 120, maxLateMinutes: 180, amount: 5000 },
    { minLateMinutes: 181, maxLateMinutes: 999, amount: 10000 },
  ]);

  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      fineRules: defaultFineRules,
    },
  });

  console.log("✅ System settings created");
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

