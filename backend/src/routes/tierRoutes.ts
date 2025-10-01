import { Router } from 'express';
import { tierController } from '../controllers/tierController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Public routes (all authenticated users can view tiers)
router.get('/tiers', verifyToken, tierController.getAllTiers);
router.get('/tiers/user/:userId?', verifyToken, tierController.getUserTier);
router.post('/tiers/check-limit', verifyToken, tierController.checkTierLimit);

// Admin only routes
router.post('/tiers', verifyToken, requireRole('ADMIN'), tierController.createTier);
router.put('/tiers/:id', verifyToken, requireRole('ADMIN'), tierController.updateTier);
router.delete('/tiers/:id', verifyToken, requireRole('ADMIN'), tierController.deleteTier);
router.post('/tiers/assign', verifyToken, requireRole('ADMIN'), tierController.assignTierToUser);
router.get('/tiers/users/all', verifyToken, requireRole('ADMIN'), tierController.getAllUserTiers);

// Internal route for incrementing usage (called by other services)
router.post('/tiers/increment-usage', verifyToken, tierController.incrementUsage);

export default router;