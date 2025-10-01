const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTiers() {
  try {
    console.log('🌱 Seeding default tiers...\n');

    const tiers = [
      {
        name: 'Free',
        description: 'Get started with basic features',
        maxExams: 3,
        maxStudyModules: 3,
        maxStudents: 10,
        price: 0,
        validityDays: 0, // Never expires
        currency: 'USD'
      },
      {
        name: 'Basic',
        description: 'Perfect for individual teachers',
        maxExams: 10,
        maxStudyModules: 20,
        maxStudents: 30,
        price: 9.99,
        validityDays: 30,
        currency: 'USD'
      },
      {
        name: 'Pro',
        description: 'Advanced features for growing classes',
        maxExams: 50,
        maxStudyModules: 100,
        maxStudents: 100,
        price: 29.99,
        validityDays: 30,
        currency: 'USD'
      },
      {
        name: 'Enterprise',
        description: 'Unlimited access for institutions',
        maxExams: 999999, // Effectively unlimited
        maxStudyModules: 999999,
        maxStudents: 999999,
        price: 99.99,
        validityDays: 30,
        currency: 'USD'
      }
    ];

    for (const tierData of tiers) {
      const existing = await prisma.tier.findFirst({
        where: { name: tierData.name }
      });

      if (existing) {
        console.log(`✅ Tier "${tierData.name}" already exists, updating...`);
        await prisma.tier.update({
          where: { id: existing.id },
          data: tierData
        });
      } else {
        console.log(`✅ Creating tier "${tierData.name}"...`);
        await prisma.tier.create({
          data: tierData
        });
      }
    }

    console.log('\n📊 Tier Summary:');
    console.log('=====================================');

    const allTiers = await prisma.tier.findMany({
      orderBy: { price: 'asc' }
    });

    allTiers.forEach(tier => {
      console.log(`\n${tier.name} - $${tier.price}/month`);
      console.log(`  • ${tier.maxExams} exams`);
      console.log(`  • ${tier.maxStudyModules} study modules`);
      console.log(`  • ${tier.maxStudents} students`);
      if (tier.validityDays === 0) {
        console.log(`  • Never expires`);
      } else {
        console.log(`  • ${tier.validityDays} day validity`);
      }
    });

    console.log('\n✨ Default tiers seeded successfully!\n');

  } catch (error) {
    console.error('❌ Error seeding tiers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTiers();