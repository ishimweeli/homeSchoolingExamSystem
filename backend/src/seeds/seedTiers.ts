import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding tiers...');

  // Create default tiers - SIMPLIFIED (only exams & modules limits)
  const tiers = [
    {
      name: 'Free Trial',
      description: 'Free trial - 7 days',
      maxExams: 2,
      maxStudyModules: 2,
      validityDays: 7,
      price: 0,
      currency: 'RWF'
    },
    {
      name: 'Basic',
      description: 'Basic plan - 30 days',
      maxExams: 10,
      maxStudyModules: 10,
      validityDays: 30,
      price: 5000,
      currency: 'RWF'
    },
    {
      name: 'Standard',
      description: 'Standard plan - 30 days',
      maxExams: 25,
      maxStudyModules: 25,
      validityDays: 30,
      price: 15000,
      currency: 'RWF'
    },
    {
      name: 'Professional',
      description: 'Professional plan - 30 days',
      maxExams: 50,
      maxStudyModules: 50,
      validityDays: 30,
      price: 30000,
      currency: 'RWF'
    },
    {
      name: 'Unlimited',
      description: 'Unlimited plan - 30 days',
      maxExams: 999999,
      maxStudyModules: 999999,
      validityDays: 30,
      price: 50000,
      currency: 'RWF'
    }
  ];

  for (const tierData of tiers) {
    const existingTier = await prisma.tier.findUnique({
      where: { name: tierData.name }
    });

    if (existingTier) {
      console.log(`Tier "${tierData.name}" already exists, updating...`);
      await prisma.tier.update({
        where: { name: tierData.name },
        data: tierData
      });
    } else {
      console.log(`Creating tier: ${tierData.name}`);
      await prisma.tier.create({
        data: tierData
      });
    }
  }

  console.log('✓ Tiers seeded successfully');

  // Create a default admin user if not exists
  const adminEmail = 'admin@homeschool.com';
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!admin) {
    console.log('Creating default admin user...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: 'admin',
        password: hashedPassword,
        name: 'System Admin',
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
        emailVerified: new Date()
      }
    });
    console.log('✓ Admin user created (email: admin@homeschool.com, password: admin123)');
  }

  // Assign unlimited tier to admin
  const unlimitedTier = await prisma.tier.findUnique({
    where: { name: 'Unlimited' }
  });

  if (unlimitedTier && admin) {
    const existingUserTier = await prisma.userTier.findUnique({
      where: { userId: admin.id }
    });

    if (!existingUserTier) {
      await prisma.userTier.create({
        data: {
          userId: admin.id,
          tierId: unlimitedTier.id,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        }
      });
      console.log('✓ Unlimited tier assigned to admin');
    }
  }
}

main()
  .catch(e => {
    console.error('Error seeding tiers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });