import { Router } from 'express';
import { getDashboardStats, getRecentActivity } from '../controllers/dashboardController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// All dashboard routes require authentication
router.get('/stats', verifyToken, getDashboardStats);
router.get('/activity', verifyToken, getRecentActivity);

export default router;