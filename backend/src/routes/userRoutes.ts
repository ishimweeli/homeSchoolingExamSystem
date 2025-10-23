import { Router } from 'express';
import { verifyToken,requireRole } from '../middleware/auth';
import { withOrg } from '../middleware/withOrg';
import { listOwnedStudents, createStudent, getStudent, updateStudent, deleteStudent } from '../controllers/userController';

const router = Router();

router.get('/students', verifyToken,requireRole('ADMIN', 'TEACHER', 'PARENT'), withOrg, listOwnedStudents);
router.post('/students', verifyToken,requireRole('ADMIN', 'TEACHER', 'PARENT'), withOrg, createStudent);
router.get('/students/:id', verifyToken,requireRole('ADMIN', 'TEACHER', 'PARENT'), withOrg, getStudent);
router.put('/students/:id', verifyToken, requireRole('ADMIN', 'TEACHER', 'PARENT'),withOrg, updateStudent);
router.delete('/students/:id', verifyToken,requireRole('ADMIN', 'TEACHER', 'PARENT'), withOrg, deleteStudent);

export default router;
