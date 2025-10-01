import { Router } from 'express';
import {
  listOwnedStudents,
  createStudent,
  getStudent,
  updateStudent,
  deleteStudent
} from '../controllers/userController';
import { verifyToken } from '../middleware/auth';
import { checkTierLimit } from '../middleware/tierLimits';

const router = Router();

// Student exam assignments - MUST come before /:id routes
router.get('/assigned-exams', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId || userRole !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { prisma } = require('../utils/db');
    const assignments = await prisma.examAssignment.findMany({
      where: { studentId: userId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            subject: true,
            gradeLevel: true,
            duration: true,
            totalMarks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Get assigned exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned exams'
    });
  }
});

// All student management routes require authentication
router.get('/', verifyToken, listOwnedStudents);
router.post('/', verifyToken, createStudent); // No tier limit for students
router.get('/:id', verifyToken, getStudent);
router.put('/:id', verifyToken, updateStudent);
router.delete('/:id', verifyToken, deleteStudent);

export default router;