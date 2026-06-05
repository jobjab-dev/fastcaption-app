const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const updated = await p.user.update({
    where: { id: 'cmpcse4k20000l504fmxcu99v' },
    data: { credits: { set: 1000000 } },
    select: { credits: true },
  });
  console.log('Credits set to:', updated.credits);
}

main().then(() => p.$disconnect());
