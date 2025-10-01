import { Router } from 'express';
import {
  getResults,
  getResult,
  gradeResult,
  publishResult,
  getStudentResults
} from '../controllers/resultsController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// All results routes require authentication
router.get('/', verifyToken, getResults);
router.get('/:id', verifyToken, getResult);
router.post('/:id/grade', verifyToken, gradeResult);
router.post('/:id/publish', verifyToken, publishResult);
router.get('/student/:studentId', verifyToken, getStudentResults);

export default router;