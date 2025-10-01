import { Request, Response } from 'express';
import { prisma } from '../utils/db';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    let stats: any = {};

    // Get user-specific stats based on role
    if (userRole === 'STUDENT') {
      // Student stats - simplified
      const [totalExamsAssigned, completedExams] = await Promise.all([
        prisma.examAssignment.count({
          where: { studentId: userId }
        }),
        prisma.examAttempt.count({
          where: {
            studentId: userId,
            isCompleted: true
          }
        })
      ]);

      const grades = await prisma.grade.findMany({
        where: { studentId: userId },
        select: { percentage: true }
      });

      const averageScore = grades.length > 0
        ? Math.round(grades.reduce((acc, g) => acc + g.percentage, 0) / grades.length)
        : 0;

      stats = {
        totalExams: totalExamsAssigned,
        completedExams,
        averageScore,
        upcomingDeadlines: 0,
        completionRate: totalExamsAssigned > 0
          ? Math.round((completedExams / totalExamsAssigned) * 100)
          : 0,
        activeAssignments: totalExamsAssigned - completedExams,
        recentActivity: 0
      };

    } else if (userRole === 'TEACHER') {
      // Teacher stats - simplified
      const [totalExams, totalStudents] = await Promise.all([
        prisma.exam.count({
          where: { creatorId: userId }
        }),
        prisma.user.count({
          where: {
            createdById: userId,
            role: 'STUDENT'
          }
        })
      ]);

      stats = {
        totalExams,
        totalStudents,
        publishedExams: 0,
        activeAssignments: 0,
        averageScore: 0,
        completionRate: 0,
        upcomingDeadlines: 0,
        recentActivity: 0
      };

    } else if (userRole === 'PARENT') {
      // Parent stats - simplified
      const children = await prisma.user.findMany({
        where: {
          parentId: userId,
          role: 'STUDENT'
        },
        select: { id: true }
      });

      const childrenIds = children.map(c => c.id);

      const totalExamsAssigned = await prisma.examAssignment.count({
        where: {
          studentId: { in: childrenIds }
        }
      });

      stats = {
        totalStudents: children.length,
        totalExams: totalExamsAssigned,
        completedExams: 0,
        averageScore: 0,
        completionRate: 0,
        activeAssignments: 0,
        upcomingDeadlines: 0,
        recentActivity: 0
      };

    } else if (userRole === 'ADMIN') {
      // Admin stats - system-wide simplified
      const [totalUsers, totalExams, totalStudents, totalTeachers] = await Promise.all([
        prisma.user.count(),
        prisma.exam.count(),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'TEACHER' } })
      ]);

      stats = {
        totalUsers,
        totalExams,
        totalStudents,
        totalTeachers,
        totalParents: 0,
        activeExams: 0,
        averageScore: 0,
        activeAssignments: 0,
        completionRate: 0,
        upcomingDeadlines: 0,
        recentActivity: 0
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    let activities: any[] = [];

    // Get recent activities based on role - simplified
    if (userRole === 'STUDENT') {
      const recentAttempts = await prisma.examAttempt.findMany({
        where: { studentId: userId },
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: {
          startedAt: true,
          isCompleted: true,
          exam: {
            select: { title: true }
          }
        }
      });

      activities = recentAttempts.map(a => ({
        type: 'exam_attempt',
        title: `Attempted exam: ${a.exam.title}`,
        timestamp: a.startedAt,
        status: a.isCompleted ? 'completed' : 'in_progress'
      }));
    }

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity'
    });
  }
};