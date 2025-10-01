import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const tierController = {
  // Get all tiers
  async getAllTiers(req: Request, res: Response) {
    try {
      const tiers = await prisma.tier.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' }
      });

      res.json({ success: true, data: tiers });
    } catch (error) {
      console.error('Error fetching tiers:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch tiers' });
    }
  },

  // Create a new tier (admin only)
  async createTier(req: Request, res: Response) {
    try {
      const { name, description, maxExams, maxStudyModules, maxStudents, validityDays, price, currency } = req.body;

      const tier = await prisma.tier.create({
        data: {
          name,
          description,
          maxExams: maxExams || 10,
          maxStudyModules: maxStudyModules || 10,
          maxStudents: maxStudents || 50,
          validityDays: validityDays || 30,
          price: price || 0,
          currency: currency || 'RWF'
        }
      });

      res.json({ success: true, data: tier });
    } catch (error) {
      console.error('Error creating tier:', error);
      res.status(500).json({ success: false, error: 'Failed to create tier' });
    }
  },

  // Update a tier (admin only)
  async updateTier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const tier = await prisma.tier.update({
        where: { id },
        data: updateData
      });

      res.json({ success: true, data: tier });
    } catch (error) {
      console.error('Error updating tier:', error);
      res.status(500).json({ success: false, error: 'Failed to update tier' });
    }
  },

  // Delete/deactivate a tier (admin only)
  async deleteTier(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tier = await prisma.tier.update({
        where: { id },
        data: { isActive: false }
      });

      res.json({ success: true, message: 'Tier deactivated successfully' });
    } catch (error) {
      console.error('Error deleting tier:', error);
      res.status(500).json({ success: false, error: 'Failed to delete tier' });
    }
  },

  // Assign tier to a user (admin only)
  async assignTierToUser(req: Request, res: Response) {
    try {
      const { userId, tierId, validityDays } = req.body;
      const adminId = (req as any).user?.id;

      // Check if tier exists
      const tier = await prisma.tier.findUnique({
        where: { id: tierId }
      });

      if (!tier) {
        return res.status(404).json({ success: false, error: 'Tier not found' });
      }

      // Calculate expiry date
      const expiresAt = validityDays
        ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + tier.validityDays * 24 * 60 * 60 * 1000);

      // Check if user already has a tier
      const existingUserTier = await prisma.userTier.findUnique({
        where: { userId }
      });

      if (existingUserTier) {
        // Update existing tier
        const userTier = await prisma.userTier.update({
          where: { userId },
          data: {
            tierId,
            assignedBy: adminId,
            assignedAt: new Date(),
            expiresAt,
            isActive: true,
            // Reset usage counters
            examsCreated: 0,
            studyModulesCreated: 0,
            studentsCreated: 0
          },
          include: { tier: true }
        });

        res.json({ success: true, data: userTier });
      } else {
        // Create new tier assignment
        const userTier = await prisma.userTier.create({
          data: {
            userId,
            tierId,
            assignedBy: adminId,
            expiresAt
          },
          include: { tier: true }
        });

        res.json({ success: true, data: userTier });
      }
    } catch (error) {
      console.error('Error assigning tier:', error);
      res.status(500).json({ success: false, error: 'Failed to assign tier' });
    }
  },

  // Get user's current tier
  async getUserTier(req: Request, res: Response) {
    try {
      const userId = req.params.userId || (req as any).user?.id;

      const userTier = await prisma.userTier.findUnique({
        where: { userId },
        include: { tier: true }
      });

      if (!userTier) {
        return res.json({ success: true, data: null });
      }

      // Check if expired
      if (userTier.expiresAt && userTier.expiresAt < new Date()) {
        await prisma.userTier.update({
          where: { userId },
          data: { isActive: false }
        });

        return res.json({
          success: true,
          data: { ...userTier, isActive: false, expired: true }
        });
      }

      // Calculate days remaining
      const daysRemaining = userTier.expiresAt
        ? Math.ceil((userTier.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      res.json({
        success: true,
        data: {
          ...userTier,
          daysRemaining,
          usageLimits: {
            examsRemaining: userTier.tier.maxExams - userTier.examsCreated,
            studyModulesRemaining: userTier.tier.maxStudyModules - userTier.studyModulesCreated,
            studentsRemaining: userTier.tier.maxStudents - userTier.studentsCreated
          }
        }
      });
    } catch (error) {
      console.error('Error fetching user tier:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch user tier' });
    }
  },

  // Get all user tier assignments (admin only)
  async getAllUserTiers(req: Request, res: Response) {
    try {
      const userTiers = await prisma.userTier.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          tier: true
        },
        orderBy: { assignedAt: 'desc' }
      });

      res.json({ success: true, data: userTiers });
    } catch (error) {
      console.error('Error fetching user tiers:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch user tiers' });
    }
  },

  // Check if user can perform action based on tier limits
  async checkTierLimit(req: Request, res: Response) {
    try {
      const { userId, action } = req.body;

      const userTier = await prisma.userTier.findUnique({
        where: { userId },
        include: { tier: true }
      });

      if (!userTier || !userTier.isActive) {
        return res.json({
          success: false,
          canPerform: false,
          message: 'No active tier found'
        });
      }

      // Check if expired
      if (userTier.expiresAt && userTier.expiresAt < new Date()) {
        await prisma.userTier.update({
          where: { userId },
          data: { isActive: false }
        });

        return res.json({
          success: false,
          canPerform: false,
          message: 'Tier has expired'
        });
      }

      let canPerform = false;
      let message = '';

      switch (action) {
        case 'CREATE_EXAM':
          canPerform = userTier.examsCreated < userTier.tier.maxExams;
          message = canPerform
            ? `Can create exam (${userTier.examsCreated}/${userTier.tier.maxExams} used)`
            : `Exam creation limit reached (${userTier.tier.maxExams} max)`;
          break;

        case 'CREATE_STUDY_MODULE':
          canPerform = userTier.studyModulesCreated < userTier.tier.maxStudyModules;
          message = canPerform
            ? `Can create study module (${userTier.studyModulesCreated}/${userTier.tier.maxStudyModules} used)`
            : `Study module creation limit reached (${userTier.tier.maxStudyModules} max)`;
          break;

        case 'CREATE_STUDENT':
          canPerform = userTier.studentsCreated < userTier.tier.maxStudents;
          message = canPerform
            ? `Can create student (${userTier.studentsCreated}/${userTier.tier.maxStudents} used)`
            : `Student creation limit reached (${userTier.tier.maxStudents} max)`;
          break;

        default:
          message = 'Unknown action';
      }

      res.json({ success: true, canPerform, message });
    } catch (error) {
      console.error('Error checking tier limit:', error);
      res.status(500).json({ success: false, error: 'Failed to check tier limit' });
    }
  },

  // Increment usage counter
  async incrementUsage(req: Request, res: Response) {
    try {
      const { userId, action } = req.body;

      const updateData: any = {};

      switch (action) {
        case 'CREATE_EXAM':
          updateData.examsCreated = { increment: 1 };
          break;
        case 'CREATE_STUDY_MODULE':
          updateData.studyModulesCreated = { increment: 1 };
          break;
        case 'CREATE_STUDENT':
          updateData.studentsCreated = { increment: 1 };
          break;
      }

      const userTier = await prisma.userTier.update({
        where: { userId },
        data: updateData,
        include: { tier: true }
      });

      res.json({ success: true, data: userTier });
    } catch (error) {
      console.error('Error incrementing usage:', error);
      res.status(500).json({ success: false, error: 'Failed to increment usage' });
    }
  }
};