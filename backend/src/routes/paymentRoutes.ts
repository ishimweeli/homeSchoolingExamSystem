import { Router } from 'express';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.post('/flutterwave/initiate', verifyToken, async (req, res) => {
  res.json({ message: 'Initiate Flutterwave payment endpoint' });
});

router.post('/flutterwave/verify', verifyToken, async (req, res) => {
  res.json({ message: 'Verify Flutterwave payment endpoint' });
});

router.post('/flutterwave/webhook', async (req, res) => {
  res.json({ message: 'Flutterwave webhook endpoint' });
});

export default router;