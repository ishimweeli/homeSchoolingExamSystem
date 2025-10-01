import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
  res.json({ message: 'Get all classes endpoint' });
});

router.post('/', verifyToken, requireRole('PARENT', 'ADMIN'), async (req, res) => {
  res.json({ message: 'Create class endpoint' });
});

router.get('/:id', verifyToken, async (req, res) => {
  res.json({ message: 'Get class by ID endpoint' });
});

router.put('/:id', verifyToken, requireRole('PARENT', 'ADMIN'), async (req, res) => {
  res.json({ message: 'Update class endpoint' });
});

router.delete('/:id', verifyToken, requireRole('PARENT', 'ADMIN'), async (req, res) => {
  res.json({ message: 'Delete class endpoint' });
});

router.get('/:id/students', verifyToken, async (req, res) => {
  res.json({ message: 'Get class students endpoint' });
});

router.post('/:id/students', verifyToken, requireRole('PARENT'), async (req, res) => {
  res.json({ message: 'Add student to class endpoint' });
});

router.delete('/:id/students/:studentId', verifyToken, requireRole('PARENT'), async (req, res) => {
  res.json({ message: 'Remove student from class endpoint' });
});

export default router;