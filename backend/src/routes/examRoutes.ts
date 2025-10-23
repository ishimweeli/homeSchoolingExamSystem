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
import { withOrg } from '../middleware/withOrg';

const router = Router();

// Exam routes
router.get('/', verifyToken,withOrg, getExams);
router.post('/', verifyToken,requireRole('PARENT', 'TEACHER', 'ADMIN'),withOrg, checkTierLimit('CREATE_EXAM'), createExam);
router.get('/:id', verifyToken, getExam);
router.put('/:id', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'),withOrg, updateExam);
router.delete('/:id', verifyToken,requireRole('PARENT', 'TEACHER', 'ADMIN'),withOrg, deleteExam);
router.post('/:id/publish',verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'),withOrg, publishExam);
router.get('/:id/assignments',verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), withOrg, getExamAssignments);
router.post('/:id/assign', verifyToken, requireRole('PARENT', 'TEACHER'), withOrg, assignExam);
router.post('/:id/unassign', withOrg, verifyToken, requireRole('PARENT', 'TEACHER'),  unassignExam);
router.post('/:id/attempt', verifyToken,withOrg, startExamAttempt);
router.post('/:id/submit', verifyToken,withOrg, submitExamWithAIGrading);
router.get('/:examId/attempts', verifyToken,withOrg, getExamAttempts);
router.get('/:examId/student-results',  verifyToken, requireRole('PARENT', 'TEACHER'),withOrg, getExamStudentResults);
router.get('/results/:attemptId', verifyToken,withOrg, getExamResults);

// AI generation
router.post('/generate',verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), withOrg, checkTierLimit('CREATE_EXAM'), generateExamWithAI);

// ADVANCED MODE: AI generation with sections
router.post('/generate-advanced', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), withOrg, checkTierLimit('CREATE_EXAM'), generateAdvancedExam);

// PDF Upload: Recreate exam from PDF
router.post('/recreate-from-pdf',verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), withOrg, checkTierLimit('CREATE_EXAM'), recreateFromPDF);

export default router;