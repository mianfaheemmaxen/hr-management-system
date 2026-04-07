import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating fines with status "unpaid" to "implemented"...');
  
  const result = await prisma.fine.updateMany({
    where: {
      status: 'unpaid'
    },
    data: {
      status: 'implemented'
    }
  });
  
  console.log(`✅ Updated ${result.count} fines`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

