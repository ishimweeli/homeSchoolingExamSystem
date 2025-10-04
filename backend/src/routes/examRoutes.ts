import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import {
  createExam,
  generateExamWithAI,
  getExams,
  getExam,
  assignExam,
  getExamAssignments,
  startExamAttempt,
  submitExam,
  getExamResults,
  publishExam,
  deleteExam,
  updateExam
} from '../controllers/examController';
import { submitExamWithAIGrading } from '../controllers/examGradingController';
import { checkTierLimit } from '../middleware/tierLimits';

const router = Router();

// Exam routes
router.get('/', verifyToken, getExams);
router.post('/', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), checkTierLimit('CREATE_EXAM'), createExam);
router.get('/:id', verifyToken, getExam);
router.put('/:id', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), updateExam);
router.delete('/:id', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), deleteExam);
router.post('/:id/publish', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), publishExam);
router.get('/:id/assignments', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), getExamAssignments);
router.post('/:id/assign', verifyToken, requireRole('PARENT', 'TEACHER'), assignExam);
router.post('/:id/attempt', verifyToken, startExamAttempt);
router.post('/:id/submit', verifyToken, submitExamWithAIGrading);
router.get('/results/:attemptId', verifyToken, getExamResults);

// AI generation
router.post('/generate', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), checkTierLimit('CREATE_EXAM'), generateExamWithAI);

export default router;