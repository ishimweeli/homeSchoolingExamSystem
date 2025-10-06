import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to check if user has an active tier
 */
export const checkActiveTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated',
        error: 'User not authenticated' 
      });
    }

    // Check if user has a tier
    const userTier = await prisma.userTier.findUnique({
      where: { userId },
      include: { tier: true }
    });

    if (!userTier) {
      return res.status(403).json({
        success: false,
        message: 'No subscription tier assigned. Please contact admin to get a subscription.',
        error: 'No subscription tier assigned. Please contact admin to get a subscription.'
      });
    }

    // Check if tier is active
    if (!userTier.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription tier is inactive. Please contact admin.',
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
        message: 'Your subscription has expired. Please renew your subscription.',
        error: 'Your subscription has expired. Please renew your subscription.'
      });
    }

    // Attach tier info to request for later use
    (req as any).userTier = userTier;
    next();
  } catch (error) {
    console.error('Check tier error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check tier status',
      error: 'Failed to check tier status'
    });
  }
};

/**
 * Check creation limits (exams, modules, students)
 */
export const checkTierLimit = (action: 'CREATE_EXAM' | 'CREATE_STUDY_MODULE' | 'CREATE_STUDENT') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated',
          error: 'User not authenticated' 
        });
      }

      // Check if user has a tier
      const userTier = await prisma.userTier.findUnique({
        where: { userId },
        include: { tier: true }
      });

      if (!userTier) {
        return res.status(403).json({
          success: false,
          message: 'No subscription tier assigned. Please contact admin to get a subscription.',
          error: 'No subscription tier assigned. Please contact admin to get a subscription.'
        });
      }

      // Check if tier is active
      if (!userTier.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your subscription tier is inactive. Please contact admin.',
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
          message: 'Your subscription has expired. Please renew your subscription.',
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

        case 'CREATE_STUDENT':
          canPerform = userTier.studentsCreated < userTier.tier.maxStudents;
          limitReachedMessage = `You have reached your student creation limit (${userTier.tier.maxStudents} students). Please upgrade your tier.`;
          break;
      }

      if (!canPerform) {
        return res.status(403).json({
          success: false,
          message: limitReachedMessage,
          error: limitReachedMessage,
          tierInfo: {
            tierName: userTier.tier.name,
            currentUsage: {
              exams: userTier.examsCreated,
              studyModules: userTier.studyModulesCreated,
              students: userTier.studentsCreated,
              attempts: userTier.attemptsUsed
            },
            limits: {
              maxExams: userTier.tier.maxExams,
              maxStudyModules: userTier.tier.maxStudyModules,
              maxStudents: userTier.tier.maxStudents,
              totalAttemptsPool: userTier.tier.totalAttemptsPool
            },
            remaining: {
              exams: userTier.tier.maxExams - userTier.examsCreated,
              studyModules: userTier.tier.maxStudyModules - userTier.studyModulesCreated,
              students: userTier.tier.maxStudents - userTier.studentsCreated,
              attempts: userTier.tier.totalAttemptsPool - userTier.attemptsUsed
            }
          }
        });
      }

      // Store tier info in request for later use
      (req as any).userTier = userTier;
      next();
    } catch (error) {
      console.error('Error checking tier limit:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to check tier limit',
        error: 'Failed to check tier limit' 
      });
    }
  };
};

/**
 * Check if teacher has enough attempts remaining in their pool
 */
export const checkAttemptPool = async (userId: string, requestedAttempts: number): Promise<{
  canAssign: boolean;
  message?: string;
  remaining?: number;
}> => {
  try {
    const userTier = await prisma.userTier.findUnique({
      where: { userId },
      include: { tier: true }
    });

    if (!userTier) {
      return { canAssign: false, message: 'No tier assigned' };
    }

    const remaining = userTier.tier.totalAttemptsPool - userTier.attemptsUsed;

    if (remaining < requestedAttempts) {
      return { 
        canAssign: false, 
        message: `Insufficient attempts. You have ${remaining} attempts remaining, but need ${requestedAttempts}.`,
        remaining
      };
    }

    return { canAssign: true, remaining };
  } catch (error) {
    console.error('Error checking attempt pool:', error);
    return { canAssign: false, message: 'Failed to check attempt pool' };
  }
};

/**
 * Deduct attempts from teacher's pool when assigning exams
 */
export const deductAttempts = async (userId: string, attempts: number): Promise<boolean> => {
  try {
    await prisma.userTier.update({
      where: { userId },
      data: {
        attemptsUsed: { increment: attempts }
      }
    });
    return true;
  } catch (error) {
    console.error('Error deducting attempts:', error);
    return false;
  }
};

/**
 * Refund attempts back to teacher's pool (e.g., when unassigning)
 */
export const refundAttempts = async (userId: string, attempts: number): Promise<boolean> => {
  try {
    await prisma.userTier.update({
      where: { userId },
      data: {
        attemptsUsed: { decrement: attempts }
      }
    });
    return true;
  } catch (error) {
    console.error('Error refunding attempts:', error);
    return false;
  }
};

/**
 * Helper function to increment usage after successful creation
 */
export const incrementTierUsage = async (userId: string, action: 'CREATE_EXAM' | 'CREATE_STUDY_MODULE' | 'CREATE_STUDENT') => {
  try {
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
