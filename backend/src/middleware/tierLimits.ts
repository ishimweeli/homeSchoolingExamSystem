import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const checkTierLimit = (action: 'CREATE_EXAM' | 'CREATE_STUDY_MODULE') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      // Check if user has a tier
      const userTier = await prisma.userTier.findUnique({
        where: { userId },
        include: { tier: true }
      });

      if (!userTier) {
        return res.status(403).json({
          success: false,
          error: 'No subscription tier assigned. Please contact admin to get a subscription.'
        });
      }

      // Check if tier is active
      if (!userTier.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Your subscription tier is inactive. Please contact admin.'
        });
      }

      // Check if tier has expired
      if (userTier.expiresAt && userTier.expiresAt < new Date()) {
        await prisma.userTier.update({
          where: { userId },
          data: { isActive: false }
        });

        return res.status(403).json({
          success: false,
          error: 'Your subscription has expired. Please renew your subscription.'
        });
      }

      // Check specific limits
      let canPerform = false;
      let limitReachedMessage = '';

      switch (action) {
        case 'CREATE_EXAM':
          canPerform = userTier.examsCreated < userTier.tier.maxExams;
          limitReachedMessage = `You have reached your exam creation limit (${userTier.tier.maxExams} exams). Please upgrade your tier.`;
          break;

        case 'CREATE_STUDY_MODULE':
          canPerform = userTier.studyModulesCreated < userTier.tier.maxStudyModules;
          limitReachedMessage = `You have reached your study module creation limit (${userTier.tier.maxStudyModules} modules). Please upgrade your tier.`;
          break;
      }

      if (!canPerform) {
        return res.status(403).json({
          success: false,
          error: limitReachedMessage,
          tierInfo: {
            tierName: userTier.tier.name,
            currentUsage: {
              exams: userTier.examsCreated,
              studyModules: userTier.studyModulesCreated
            },
            limits: {
              maxExams: userTier.tier.maxExams,
              maxStudyModules: userTier.tier.maxStudyModules
            }
          }
        });
      }

      // Store tier info in request for later use
      (req as any).userTier = userTier;
      next();
    } catch (error) {
      console.error('Error checking tier limit:', error);
      res.status(500).json({ success: false, error: 'Failed to check tier limit' });
    }
  };
};

// Helper function to increment usage after successful creation
export const incrementTierUsage = async (userId: string, action: 'CREATE_EXAM' | 'CREATE_STUDY_MODULE') => {
  try {
    const updateData: any = {};

    switch (action) {
      case 'CREATE_EXAM':
        updateData.examsCreated = { increment: 1 };
        break;
      case 'CREATE_STUDY_MODULE':
        updateData.studyModulesCreated = { increment: 1 };
        break;
    }

    await prisma.userTier.update({
      where: { userId },
      data: updateData
    });

    return true;
  } catch (error) {
    console.error('Error incrementing tier usage:', error);
    return false;
  }
};