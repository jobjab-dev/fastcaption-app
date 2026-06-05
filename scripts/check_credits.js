const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    select: { id: true, email: true, credits: true },
    take: 5,
  });
  console.log(JSON.stringify(users, null, 2));

  // Find API key owner
  const apiKeys = await p.apiKey.findMany({
    select: { key: true, userId: true },
    take: 5,
  });
  console.log("\nAPI Keys:", JSON.stringify(apiKeys, null, 2));
}

main().then(() => p.$disconnect());
