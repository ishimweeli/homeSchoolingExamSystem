import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/me', verifyToken, async (req, res) => {
  res.json({ message: 'Get current user subscription endpoint' });
});

router.get('/tiers', async (req, res) => {
  res.json({ message: 'Get subscription tiers endpoint' });
});

router.get('/active-slots', verifyToken, async (req, res) => {
  res.json({ message: 'Get active slots endpoint' });
});

export default router;