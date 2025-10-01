import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/stats', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const [totalUsers, totalTeachers, totalStudents, totalParents, totalAdmins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'PARENT' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        byRole: {
          ADMIN: totalAdmins,
          TEACHER: totalTeachers,
          STUDENT: totalStudents,
          PARENT: totalParents,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load admin stats' });
  }
});

router.get('/users', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();

    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

// Soft-delete (deactivate) a user
router.delete('/users/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// Reactivate a user
router.patch('/users/:id/activate', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.update({ where: { id }, data: { isActive: true } });
    res.json({ success: true, message: 'User activated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to activate user' });
  }
});

router.get('/subscriptions', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const subscriptions = await prisma.userTier.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        tier: true,
      },
      orderBy: { assignedAt: 'desc' },
    });
    res.json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load subscriptions' });
  }
});

export default router;