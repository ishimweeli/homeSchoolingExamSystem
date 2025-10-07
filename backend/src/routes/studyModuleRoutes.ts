import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import {
  createStudyModule,
  generateStudyModuleWithAI,
  generateCourseOutline,
  generateSingleLesson,
  generateAllLessons,
  getStudyModules,
  getStudyModule,
  assignStudyModule,
  startStudyModule,
  submitStepAnswer,
  getStudentProgress,
  getModuleLeaderboard
} from '../controllers/studyModuleController';

const router = Router();

// Study module CRUD routes
router.get('/', verifyToken, getStudyModules);
router.post('/', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), createStudyModule);
router.get('/:id', verifyToken, getStudyModule);
router.post('/:id/assign', verifyToken, requireRole('PARENT', 'TEACHER'), assignStudyModule);

// AI generation (2-step approach)
router.post('/generate-outline', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), generateCourseOutline);
router.post('/:moduleId/generate-lesson/:lessonNumber', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), generateSingleLesson);
router.post('/:moduleId/generate-all-lessons', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), generateAllLessons);

// AI generation (legacy - full course at once)
router.post('/generate', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), generateStudyModuleWithAI);

// Interactive learning routes
router.post('/:id/start', verifyToken, startStudyModule);
router.post('/:moduleId/submit', verifyToken, submitStepAnswer);
router.get('/:moduleId/progress', verifyToken, getStudentProgress);

// Gamification
router.get('/:moduleId/leaderboard', verifyToken, getModuleLeaderboard);

export default router;