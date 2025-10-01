import { PrismaClient, BillingInterval } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding subscription tiers...');

  // Create subscription tiers in USD (universal currency)
  const tiers = [
    {
      name: 'Free Trial',
      description: 'Try our platform with limited features',
      priceCents: 0,
      currency: 'USD',
      interval: 'CUSTOM_DAYS' as BillingInterval,
      billingDays: 7,
      examLimitPerPeriod: 2,
      studyModuleLimitPerPeriod: 2,
      maxAttemptsPerExam: 1,
      creatorExamCreateLimitPerPeriod: 1,
      creatorModuleCreateLimitPerPeriod: 1,
      isActive: true,
    },
    {
      name: 'Basic',
      description: 'Perfect for individual homeschool families',
      priceCents: 999, // $9.99/month
      currency: 'USD',
      interval: 'MONTH' as BillingInterval,
      billingDays: 30,
      examLimitPerPeriod: 10,
      studyModuleLimitPerPeriod: 10,
      maxAttemptsPerExam: 2,
      creatorExamCreateLimitPerPeriod: 5,
      creatorModuleCreateLimitPerPeriod: 5,
      isActive: true,
    },
    {
      name: 'Premium',
      description: 'Ideal for active homeschool families with multiple children',
      priceCents: 1999, // $19.99/month
      currency: 'USD',
      interval: 'MONTH' as BillingInterval,
      billingDays: 30,
      examLimitPerPeriod: 50,
      studyModuleLimitPerPeriod: 30,
      maxAttemptsPerExam: 3,
      creatorExamCreateLimitPerPeriod: 20,
      creatorModuleCreateLimitPerPeriod: 20,
      isActive: true,
    },
    {
      name: 'Professional',
      description: 'Best for homeschool co-ops and tutoring centers',
      priceCents: 4999, // $49.99/month
      currency: 'USD',
      interval: 'MONTH' as BillingInterval,
      billingDays: 30,
      examLimitPerPeriod: 0, // Unlimited
      studyModuleLimitPerPeriod: 0, // Unlimited
      maxAttemptsPerExam: 5,
      creatorExamCreateLimitPerPeriod: 0, // Unlimited
      creatorModuleCreateLimitPerPeriod: 0, // Unlimited
      isActive: true,
    },
    {
      name: 'Basic Annual',
      description: 'Basic plan billed annually (save 20%)',
      priceCents: 9590, // $95.90/year (was $119.88)
      currency: 'USD',
      interval: 'YEAR' as BillingInterval,
      billingDays: 365,
      examLimitPerPeriod: 120, // 10 per month equivalent
      studyModuleLimitPerPeriod: 120,
      maxAttemptsPerExam: 2,
      creatorExamCreateLimitPerPeriod: 60,
      creatorModuleCreateLimitPerPeriod: 60,
      isActive: true,
    },
    {
      name: 'Premium Annual',
      description: 'Premium plan billed annually (save 20%)',
      priceCents: 19190, // $191.90/year (was $239.88)
      currency: 'USD',
      interval: 'YEAR' as BillingInterval,
      billingDays: 365,
      examLimitPerPeriod: 600,
      studyModuleLimitPerPeriod: 360,
      maxAttemptsPerExam: 3,
      creatorExamCreateLimitPerPeriod: 240,
      creatorModuleCreateLimitPerPeriod: 240,
      isActive: true,
    },
  ];

  for (const tier of tiers) {
    const existing = await prisma.subscriptionTier.findFirst({
      where: { name: tier.name }
    });

    if (existing) {
      console.log(`Updating tier: ${tier.name}`);
      await prisma.subscriptionTier.update({
        where: { id: existing.id },
        data: tier
      });
    } else {
      console.log(`Creating tier: ${tier.name}`);
      await prisma.subscriptionTier.create({
        data: tier
      });
    }
  }

  console.log('Subscription tiers seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });