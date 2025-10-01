import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import {
  createStudyModule,
  generateStudyModuleWithAI,
  getStudyModules,
  getStudyModule,
  assignStudyModule,
  startStudyModule,
  submitStepAnswer,
  getStudentProgress,
  getModuleLeaderboard
} from '../controllers/studyModuleController';
import { checkTierLimit } from '../middleware/tierLimits';

const router = Router();

// Student assignments endpoint - must come before other routes
router.get('/assignments', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId || userRole !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { prisma } = require('../utils/db');
    const assignments = await prisma.studyModuleAssignment.findMany({
      where: { studentId: userId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            subject: true,
            topic: true,
            gradeLevel: true,
            difficulty: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Get assigned modules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned modules'
    });
  }
});

// Study module CRUD routes
router.get('/', verifyToken, getStudyModules);
router.post('/', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), checkTierLimit('CREATE_STUDY_MODULE'), createStudyModule);
router.get('/:id', verifyToken, getStudyModule);
router.post('/:id/assign', verifyToken, requireRole('PARENT', 'TEACHER'), assignStudyModule);

// AI generation
router.post('/generate', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), checkTierLimit('CREATE_STUDY_MODULE'), generateStudyModuleWithAI);

// Interactive learning routes
router.post('/:id/start', verifyToken, startStudyModule);
router.post('/:moduleId/submit', verifyToken, submitStepAnswer);
router.get('/:moduleId/progress', verifyToken, getStudentProgress);

// Gamification
router.get('/:moduleId/leaderboard', verifyToken, getModuleLeaderboard);

export default router;