import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all tiers
router.get('/', requireAuth, async (req: Request, res: Response) => {
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
});

// Get user's current tier and usage
router.get('/my-tier', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const userTier = await prisma.userTier.findUnique({
      where: { userId },
      include: { tier: true }
    });

    if (!userTier) {
      // Assign default free tier
      const freeTier = await prisma.tier.findFirst({
        where: { name: 'Free' }
      });

      if (freeTier) {
        const newUserTier = await prisma.userTier.create({
          data: {
            userId,
            tierId: freeTier.id,
            expiresAt: null // Free tier doesn't expire
          },
          include: { tier: true }
        });
        return res.json({ success: true, data: newUserTier });
      }
    }

    res.json({ success: true, data: userTier });
  } catch (error) {
    console.error('Error fetching user tier:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user tier' });
  }
});

// Create new tier (Admin only)
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, maxExams, maxStudyModules, maxStudents, price, validityDays } = req.body;

    const tier = await prisma.tier.create({
      data: {
        name,
        description,
        maxExams,
        maxStudyModules,
        maxStudents,
        price,
        validityDays
      }
    });

    res.json({ success: true, data: tier });
  } catch (error) {
    console.error('Error creating tier:', error);
    res.status(500).json({ success: false, error: 'Failed to create tier' });
  }
});

// Update tier (Admin only)
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, maxExams, maxStudyModules, maxStudents, price, validityDays, isActive } = req.body;

    const tier = await prisma.tier.update({
      where: { id },
      data: {
        name,
        description,
        maxExams,
        maxStudyModules,
        maxStudents,
        price,
        validityDays,
        isActive
      }
    });

    res.json({ success: true, data: tier });
  } catch (error) {
    console.error('Error updating tier:', error);
    res.status(500).json({ success: false, error: 'Failed to update tier' });
  }
});

// Delete tier (Admin only)
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if tier is in use
    const usersWithTier = await prisma.userTier.count({
      where: { tierId: id }
    });

    if (usersWithTier > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete tier that is assigned to users'
      });
    }

    await prisma.tier.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Tier deleted successfully' });
  } catch (error) {
    console.error('Error deleting tier:', error);
    res.status(500).json({ success: false, error: 'Failed to delete tier' });
  }
});

// Get all user subscriptions (Admin only)
router.get('/subscriptions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const subscriptions = await prisma.userTier.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        tier: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
  }
});

// Assign tier to user (Admin only)
router.post('/assign', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, tierId } = req.body;
    const adminId = (req as any).user.id;

    // Get tier details
    const tier = await prisma.tier.findUnique({
      where: { id: tierId }
    });

    if (!tier) {
      return res.status(404).json({ success: false, error: 'Tier not found' });
    }

    // Calculate expiry date
    const expiresAt = tier.validityDays
      ? new Date(Date.now() + tier.validityDays * 24 * 60 * 60 * 1000)
      : null;

    // Upsert user tier
    const userTier = await prisma.userTier.upsert({
      where: { userId },
      create: {
        userId,
        tierId,
        assignedBy: adminId,
        expiresAt,
        examsCreated: 0,
        studyModulesCreated: 0,
        studentsCreated: 0
      },
      update: {
        tierId,
        assignedBy: adminId,
        assignedAt: new Date(),
        expiresAt,
        // Reset usage when changing tier
        examsCreated: 0,
        studyModulesCreated: 0,
        studentsCreated: 0
      },
      include: {
        tier: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({ success: true, data: userTier });
  } catch (error) {
    console.error('Error assigning tier:', error);
    res.status(500).json({ success: false, error: 'Failed to assign tier' });
  }
});

// Reset usage for all users (Admin only - for monthly reset)
router.post('/reset-usage', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.userTier.updateMany({
      data: {
        examsCreated: 0,
        studyModulesCreated: 0,
        studentsCreated: 0
      }
    });

    res.json({ success: true, message: 'Usage reset for all users' });
  } catch (error) {
    console.error('Error resetting usage:', error);
    res.status(500).json({ success: false, error: 'Failed to reset usage' });
  }
});

// Check if user can perform action based on tier limits
router.post('/check-limit', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { action } = req.body; // 'exam', 'module', 'student'

    const userTier = await prisma.userTier.findUnique({
      where: { userId },
      include: { tier: true }
    });

    if (!userTier) {
      return res.json({ success: true, canPerform: false, message: 'No tier assigned' });
    }

    // Check if tier is expired
    if (userTier.expiresAt && userTier.expiresAt < new Date()) {
      return res.json({ success: true, canPerform: false, message: 'Tier has expired' });
    }

    let canPerform = false;
    let remaining = 0;

    switch (action) {
      case 'exam':
        canPerform = userTier.examsCreated < userTier.tier.maxExams;
        remaining = userTier.tier.maxExams - userTier.examsCreated;
        break;
      case 'module':
        canPerform = userTier.studyModulesCreated < userTier.tier.maxStudyModules;
        remaining = userTier.tier.maxStudyModules - userTier.studyModulesCreated;
        break;
      case 'student':
        canPerform = userTier.studentsCreated < userTier.tier.maxStudents;
        remaining = userTier.tier.maxStudents - userTier.studentsCreated;
        break;
    }

    res.json({
      success: true,
      canPerform,
      remaining,
      tierName: userTier.tier.name
    });
  } catch (error) {
    console.error('Error checking limit:', error);
    res.status(500).json({ success: false, error: 'Failed to check limit' });
  }
});

export default router;