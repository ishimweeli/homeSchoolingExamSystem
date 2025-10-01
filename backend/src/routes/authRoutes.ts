import { Router } from 'express';
import passport from '../config/passport';
import { register, login, refreshToken, getProfile, updateProfile, googleCallback, requestPasswordReset, resetPassword, resendVerification, verifyEmail, me, logout } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', refreshToken);
router.get('/me', verifyToken, me);
router.post('/logout', verifyToken, logout);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/resend-verification', resendVerification);
router.get('/verify-email', verifyEmail);

// Google OAuth2
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  googleCallback
);

export default router;