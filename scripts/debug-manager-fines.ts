import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all managers
  const managers = await prisma.user.findMany({
    where: {
      role: 'manager'
    },
    include: {
      employee: true
    }
  });
  
  console.log('\n=== MANAGERS ===');
  for (const manager of managers) {
    console.log(`\nManager: ${manager.firstName} ${manager.lastName}`);
    console.log(`  User ID: ${manager.id}`);
    console.log(`  Employee ID: ${manager.employee?.id || 'NO EMPLOYEE RECORD'}`);
    
    if (manager.employee) {
      // Find fines for this manager
      const fines = await prisma.fine.findMany({
        where: {
          employeeId: manager.employee.id
        }
      });
      
      console.log(`  Fines count: ${fines.length}`);
      fines.forEach((fine, index) => {
        console.log(`    Fine ${index + 1}: ${fine.status}, Amount: ${fine.amount}, Date: ${fine.date.toISOString().split('T')[0]}`);
        console.log(`      Compensation Requested: ${fine.compensationRequested}, Status: ${fine.compensationStatus || 'N/A'}`);
      });
    }
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

