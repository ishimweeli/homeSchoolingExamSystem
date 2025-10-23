import { Router } from 'express';
import { getDashboardStats, getRecentActivity } from '../controllers/dashboardController';
import { verifyToken } from '../middleware/auth';
import { withOrg } from '../middleware/withOrg';

const router = Router();

// All dashboard routes require authentication
router.get('/stats', verifyToken,withOrg, getDashboardStats);
router.get('/activity', verifyToken,withOrg, getRecentActivity);

export default router;