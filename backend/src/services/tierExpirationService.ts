import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

export class TierExpirationService {
  private cronJob: cron.ScheduledTask | null = null;

  // Start the cron job to check for expired tiers
  start() {
    // Run every day at midnight
    this.cronJob = cron.schedule('0 0 * * *', async () => {
      console.log('Running tier expiration check...');
      await this.checkExpiredTiers();
    });

    console.log('Tier expiration service started');

    // Also run once on startup
    this.checkExpiredTiers();
  }

  // Stop the cron job
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Tier expiration service stopped');
    }
  }

  // Check for expired tiers and deactivate them
  async checkExpiredTiers() {
    try {
      const now = new Date();

      // Find all expired active tiers
      const expiredTiers = await prisma.userTier.findMany({
        where: {
          isActive: true,
          expiresAt: {
            lt: now
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          }
        }
      });

      if (expiredTiers.length > 0) {
        console.log(`Found ${expiredTiers.length} expired tiers to deactivate`);

        // Deactivate all expired tiers
        await prisma.userTier.updateMany({
          where: {
            isActive: true,
            expiresAt: {
              lt: now
            }
          },
          data: {
            isActive: false
          }
        });

        // Log each expired tier
        for (const tier of expiredTiers) {
          console.log(`Deactivated tier for user: ${tier.user.email || tier.user.username}`);

          // TODO: Send email notification to user about tier expiration
          // await sendTierExpirationEmail(tier.user.email, tier);
        }
      }

      // Check for tiers expiring soon (within 3 days)
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const expiringSoonTiers = await prisma.userTier.findMany({
        where: {
          isActive: true,
          expiresAt: {
            gte: now,
            lte: threeDaysFromNow
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          },
          tier: true
        }
      });

      if (expiringSoonTiers.length > 0) {
        console.log(`Found ${expiringSoonTiers.length} tiers expiring soon`);

        // TODO: Send reminder emails
        for (const userTier of expiringSoonTiers) {
          const daysRemaining = Math.ceil((userTier.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`Tier for user ${userTier.user.email || userTier.user.username} expires in ${daysRemaining} days`);

          // TODO: Send reminder email
          // await sendTierExpirationReminderEmail(userTier.user.email, userTier, daysRemaining);
        }
      }

    } catch (error) {
      console.error('Error checking expired tiers:', error);
    }
  }

  // Reset monthly/periodic limits for active tiers
  async resetPeriodicLimits() {
    try {
      console.log('Resetting periodic tier limits...');

      // Get all active tiers
      const activeTiers = await prisma.userTier.findMany({
        where: {
          isActive: true
        },
        include: {
          tier: true
        }
      });

      // Reset usage counters for monthly plans
      for (const userTier of activeTiers) {
        // Check if it's been a month since last reset
        const lastReset = userTier.updatedAt;
        const now = new Date();
        const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

        // Reset if it's been 30 days or based on tier validity days
        if (daysSinceReset >= 30) {
          await prisma.userTier.update({
            where: { id: userTier.id },
            data: {
              examsCreated: 0,
              studyModulesCreated: 0,
              studentsCreated: 0
            }
          });

          console.log(`Reset usage limits for user tier ${userTier.id}`);
        }
      }

      console.log('✓ Periodic tier limits reset complete');
    } catch (error) {
      console.error('Error resetting periodic limits:', error);
    }
  }
}

// Export a singleton instance
export const tierExpirationService = new TierExpirationService();