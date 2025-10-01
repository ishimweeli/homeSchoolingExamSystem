import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { listOwnedStudents, createStudent, getStudent, updateStudent, deleteStudent } from '../controllers/userController';

const router = Router();

router.get('/students', verifyToken, listOwnedStudents);
router.post('/students', verifyToken, requireRole('PARENT', 'TEACHER'), createStudent);
router.get('/students/:id', verifyToken, getStudent);
router.put('/students/:id', verifyToken, requireRole('PARENT', 'TEACHER'), updateStudent);
router.delete('/students/:id', verifyToken, requireRole('PARENT', 'TEACHER', 'ADMIN'), deleteStudent);

export default router;