import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import {
  initiatePayment,
  verifyPayment,
  handleWebhook,
  getPaymentHistory
} from '../controllers/paymentController';

const router = Router();

// Initiate payment
router.post('/initiate', verifyToken, initiatePayment);

// Verify payment after redirect
router.get('/verify', verifyToken, verifyPayment);

// Flutterwave webhook (no auth required - verified by signature)
router.post('/webhook', handleWebhook);

// Get payment history
router.get('/history', verifyToken, getPaymentHistory);

// Legacy routes for backward compatibility
router.post('/flutterwave/initiate', verifyToken, initiatePayment);
router.post('/flutterwave/verify', verifyToken, verifyPayment);
router.post('/flutterwave/webhook', handleWebhook);

export default router;