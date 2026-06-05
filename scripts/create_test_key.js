const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }
  
  // Try to find existing test key
  let key = await prisma.apiKey.findUnique({ where: { key: 'fc-test-key-123' } });
  
  if (!key) {
    key = await prisma.apiKey.create({
      data: {
        name: 'Test Key',
        key: 'fc-test-key-123',
        userId: user.id
      }
    });
    console.log('Created new test key');
  } else {
    console.log('Test key already exists');
  }
  
  console.log('API_KEY:', key.key);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
