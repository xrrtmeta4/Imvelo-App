import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const user = await prisma.user.upsert({
    where: { email: 'admin@imvelo.app' },
    update: {},
    create: {
      email: 'admin@imvelo.app',
      fullName: 'Admin User',
      role: 'admin',
      country: 'US',
      countryCode: 'US',
      preferredLanguage: 'en',
    },
  });

  console.log('Created user:', user.email);

  await prisma.subscription.upsert({
    where: { id: `${user.id}-free` },
    update: {},
    create: {
      userId: user.id,
      plan: 'free',
      status: 'active',
    },
  });

  console.log('Created free subscription');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
