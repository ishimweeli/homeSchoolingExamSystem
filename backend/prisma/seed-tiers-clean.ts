import { PrismaClient, BillingInterval } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creating clean subscription tiers...');

  // Clear existing tiers
  await prisma.subscriptionTier.deleteMany();
  console.log('✅ Cleared old tiers');

  // Create new simplified subscription tiers
  const tiers = [
    {
      name: 'Starter',
      description: 'Perfect for trying out the platform',
      priceCents: 0, // Free
      currency: 'USD',
      interval: 'MONTH' as BillingInterval,
      billingDays: 30,

      // Content Creation Limits (per month)
      creatorExamCreateLimitPerPeriod: 2,        // Can create 2 exams
      creatorModuleCreateLimitPerPeriod: 2,      // Can create 2 modules

      // Assignment Limits (students per content)
      examLimitPerPeriod: 5,                     // Max 5 active students per month
      studyModuleLimitPerPeriod: 5,              // Same limit for consistency
      maxAttemptsPerExam: 0,                     // DEPRECATED - not used anymore

      isActive: true,
    },
    {
      name: 'Basic',
      description: 'Great for small homeschool families',
      priceCents: 999, // $9.99/month
      currency: 'USD',
      interval: 'MONTH' as BillingInterval,
      billingDays: 30,

      // Content Creation Limits (per month)
      creatorExamCreateLimitPerPeriod: 10,       // Can create 10 exams
      creatorModuleCreateLimitPerPeriod: 10,     // Can create 10 modules

      // Assignment Limits (students per content)
      examLimitPerPeriod: 20,                    // Can assign each exam to 20 students
      studyModuleLimitPerPeriod: 20,             // Can assign each module to 20 students
      maxAttemptsPerExam: 0,                     // DEPRECATED - not used anymore

      isActive: true,
    },
    {
      name: 'Professional',
      description: 'Ideal for active families with multiple children',
      priceCents: 1999, // $19.99/month
      currency: 'USD',
      interval: 'MONTH' as BillingInterval,
      billingDays: 30,

      // Content Creation Limits (per month)
      creatorExamCreateLimitPerPeriod: 30,       // Can create 30 exams
      creatorModuleCreateLimitPerPeriod: 30,     // Can create 30 modules

      // Assignment Limits (students per content)
      examLimitPerPeriod: 50,                    // Can assign each exam to 50 students
      studyModuleLimitPerPeriod: 50,             // Can assign each module to 50 students
      maxAttemptsPerExam: 0,                     // DEPRECATED - not used anymore

      isActive: true,
    },
    {
      name: 'School',
      description: 'Perfect for co-ops and tutoring centers',
      priceCents: 4999, // $49.99/month
      currency: 'USD',
      interval: 'MONTH' as BillingInterval,
      billingDays: 30,

      // Content Creation Limits (per month)
      creatorExamCreateLimitPerPeriod: 100,      // Can create 100 exams
      creatorModuleCreateLimitPerPeriod: 100,    // Can create 100 modules

      // Assignment Limits (students per content)
      examLimitPerPeriod: 200,                   // Can assign each exam to 200 students
      studyModuleLimitPerPeriod: 200,            // Can assign each module to 200 students
      maxAttemptsPerExam: 0,                     // DEPRECATED - not used anymore

      isActive: true,
    },
    {
      name: 'Enterprise',
      description: 'Unlimited everything for large organizations',
      priceCents: 9999, // $99.99/month
      currency: 'USD',
      interval: 'MONTH' as BillingInterval,
      billingDays: 30,

      // Content Creation Limits (per month)
      creatorExamCreateLimitPerPeriod: 0,        // Unlimited (0 = no limit)
      creatorModuleCreateLimitPerPeriod: 0,      // Unlimited

      // Assignment Limits (students per content)
      examLimitPerPeriod: 0,                     // Unlimited assignments
      studyModuleLimitPerPeriod: 0,              // Unlimited assignments
      maxAttemptsPerExam: 0,                     // DEPRECATED - not used anymore

      isActive: true,
    },
  ];

  // Create all tiers
  for (const tier of tiers) {
    const created = await prisma.subscriptionTier.create({
      data: tier
    });
    console.log(`✅ Created tier: ${created.name} - $${created.priceCents/100}/month`);
  }

  console.log('\n📊 Tier Summary:');
  console.log('=====================================');
  console.log('Starter (Free): 2 exams, 2 modules, 5 students each');
  console.log('Basic ($9.99): 10 exams, 10 modules, 20 students each');
  console.log('Professional ($19.99): 30 exams, 30 modules, 50 students each');
  console.log('School ($49.99): 100 exams, 100 modules, 200 students each');
  console.log('Enterprise ($99.99): Unlimited everything');
  console.log('=====================================\n');

  console.log('✨ Subscription tiers created successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });