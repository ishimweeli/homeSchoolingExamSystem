import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tiers = [
    {
      id: 'tier_basic_001',
      name: 'Basic',
      description: 'Basic plan for new teachers',
      maxExams: 5,
      maxStudyModules: 5,
      maxStudents: 20,
      totalAttemptsPool: 50,
      validityDays: 30,
      price: 0,
      currency: 'RWF',
      isActive: true,
    },
    {
      id: 'tier_standard_001',
      name: 'Standard',
      description: 'Standard plan with more features',
      maxExams: 10,
      maxStudyModules: 10,
      maxStudents: 50,
      totalAttemptsPool: 100,
      validityDays: 60,
      price: 5000,
      currency: 'RWF',
      isActive: true,
    },
    {
      id: 'tier_premium_001',
      name: 'Premium',
      description: 'Full-featured plan for large classes',
      maxExams: 20,
      maxStudyModules: 20,
      maxStudents: 100,
      totalAttemptsPool: 200,
      validityDays: 90,
      price: 15000,
      currency: 'RWF',
      isActive: true,
    },
  ];

  for (const tier of tiers) {
    await prisma.tier.upsert({
      where: { name: tier.name },
      update: tier,
      create: tier,
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
