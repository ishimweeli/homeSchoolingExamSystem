import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import {
  createExam,
  generateExamWithAI,
  generateAdvancedExam,
  recreateFromPDF,
  getExams,
  getExam,
  assignExam,
  unassignExam,
  getExamAssignments,
  startExamAttempt,
  submitExam,
  getExamResults,
  getExamAttempts,
  getExamStudentResults,
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
router.post('/:id/unassign', verifyToken, requireRole('PARENT', 'TEACHER'), unassignExam);
router.post('/:id/attempt', verifyToken, startExamAttempt);
router.post('/:id/submit', verifyToken, submitExamWithAIGrading);
router.get('/:examId/attempts', verifyToken, getExamAttempts);
router.get('/:examId/student-results', verifyToken, requireRole('PARENT', 'TEACHER'), getExamStudentResults);
router.get('/results/:attemptId', verifyToken, getExamResults);

// AI generation
router.post('/generate', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), checkTierLimit('CREATE_EXAM'), generateExamWithAI);

// ADVANCED MODE: AI generation with sections
router.post('/generate-advanced', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), checkTierLimit('CREATE_EXAM'), generateAdvancedExam);

// PDF Upload: Recreate exam from PDF
router.post('/recreate-from-pdf', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), checkTierLimit('CREATE_EXAM'), recreateFromPDF);

export default router;