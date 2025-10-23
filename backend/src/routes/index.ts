import { Router } from 'express';
import authRoutes from './authRoutes';
import examRoutes from './examRoutes';
import studyRoutes from './studyRoutes';
import classRoutes from './classRoutes';
import userRoutes from './userRoutes';
import paymentRoutes from './paymentRoutes';
import subscriptionRoutes from './subscriptionRoutes';
import adminRoutes from './adminRoutes';
import dashboardRoutes from './dashboardRoutes';
import resultsRoutes from './resultsRoutes';
import studentsRoutes from './studentsRoutes';
import tierRoutes from './tierRoutes';
import inviteRoutes from './inviteRoutes'

const router = Router();

router.use('/auth', authRoutes);
router.use('/exams', examRoutes);
router.use('/study-modules', studyRoutes);
router.use('/classes', classRoutes);
router.use('/users', userRoutes);
router.use('/payments', paymentRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/admin', adminRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/results', resultsRoutes);
router.use('/students', studentsRoutes);
router.use('/', tierRoutes); // Tier routes at root level
router.use('/invites', inviteRoutes);

export default router;