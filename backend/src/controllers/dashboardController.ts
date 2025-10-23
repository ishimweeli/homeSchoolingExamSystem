import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { ExamStatus } from '@prisma/client';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const orgId = (req as any).orgId;
    const userRole = (req as any).user?.role;

    if (!userId || !orgId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let stats: any = {};

    if (userRole === 'STUDENT') {
      // Exams assigned to this student within current org
      const [totalExamsAssigned, completedExams] = await Promise.all([
        prisma.examAssignment.count({
          where: { studentId: userId, exam: { organizationId: orgId } },
        }),
        prisma.examAttempt.count({
          where: { studentId: userId, isCompleted: true, exam: { organizationId: orgId } },
        }),
      ]);

      const grades = await prisma.grade.findMany({
        where: {
          studentId: userId,
          attempt: { is: { exam: { organizationId: orgId } } },
        },
        select: { percentage: true },
      });

      const averageScore =
        grades.length > 0
          ? Math.round(grades.reduce((acc, g) => acc + g.percentage, 0) / grades.length)
          : 0;

      stats = {
        totalExams: totalExamsAssigned,
        completedExams,
        averageScore,
        completionRate:
          totalExamsAssigned > 0
            ? Math.round((completedExams / totalExamsAssigned) * 100)
            : 0,
      };
    } 
    else if (userRole === 'TEACHER') {
      // Only exams created by this teacher
      const [totalExams, totalStudents] = await Promise.all([
        prisma.exam.count({ where: { creatorId: userId, organizationId: orgId } }),
        prisma.user.count({
          where: {
            role: 'STUDENT',
            memberships: { some: { orgId, status: 'ACTIVE' } },
            createdById: userId, // only their own students
          },
        }),
      ]);

      stats = {
        totalExams,
        totalStudents,
        publishedExams: await prisma.exam.count({
          where: { creatorId: userId, organizationId: orgId, status: ExamStatus.ACTIVE },
        }),
      };
    } 
    else if (userRole === 'PARENT') {
      // Only children of this parent
      const children = await prisma.user.findMany({
        where: { role: 'STUDENT', parentId: userId, memberships: { some: { orgId, status: 'ACTIVE' } } },
        select: { id: true },
      });
      const childrenIds = children.map(c => c.id);

      const totalExamsAssigned = await prisma.examAssignment.count({
        where: { studentId: { in: childrenIds }, exam: { organizationId: orgId } },
      });

      const completedExams = await prisma.examAttempt.count({
        where: { studentId: { in: childrenIds }, isCompleted: true, exam: { organizationId: orgId } },
      });

      const grades = await prisma.grade.findMany({
        where: { studentId: { in: childrenIds }, attempt: { is: { exam: { organizationId: orgId } } } },
        select: { percentage: true },
      });

      const averageScore =
        grades.length > 0
          ? Math.round(grades.reduce((acc, g) => acc + g.percentage, 0) / grades.length)
          : 0;

      stats = {
        totalStudents: children.length,
        totalExams: totalExamsAssigned,
        completedExams,
        averageScore,
        completionRate:
          totalExamsAssigned > 0
            ? Math.round((completedExams / totalExamsAssigned) * 100)
            : 0,
      };
    } 
    else if (userRole === 'ADMIN') {
      // Admin sees everything
      const [totalUsers, totalExams, totalStudents, totalTeachers] = await Promise.all([
        prisma.user.count({ where: { memberships: { some: { orgId, status: 'ACTIVE' } } } }),
        prisma.exam.count({ where: { organizationId: orgId } }),
        prisma.user.count({ where: { role: 'STUDENT', memberships: { some: { orgId, status: 'ACTIVE' } } } }),
        prisma.user.count({ where: { role: 'TEACHER', memberships: { some: { orgId, status: 'ACTIVE' } } } }),
      ]);

      stats = { totalUsers, totalExams, totalStudents, totalTeachers };
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const orgId = (req as any).orgId;
    const userRole = (req as any).user?.role;

    if (!userId || !orgId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let activities: any[] = [];

    if (userRole === 'STUDENT') {
      const recentAttempts = await prisma.examAttempt.findMany({
        where: { studentId: userId, exam: { organizationId: orgId } },
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: { startedAt: true, isCompleted: true, exam: { select: { title: true } } },
      });

      activities = recentAttempts.map(a => ({
        type: 'exam_attempt',
        title: `Attempted exam: ${a.exam.title}`,
        timestamp: a.startedAt,
        status: a.isCompleted ? 'completed' : 'in_progress',
      }));
    } 
    else if (userRole === 'TEACHER') {
      const createdExams = await prisma.exam.findMany({
        where: { creatorId: userId, organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true, createdAt: true },
      });

      activities = createdExams.map(e => ({
        type: 'exam_created',
        title: `Created exam: ${e.title}`,
        timestamp: e.createdAt,
      }));
    } 
    else if (userRole === 'PARENT') {
      const children = await prisma.user.findMany({
        where: { role: 'STUDENT', parentId: userId, memberships: { some: { orgId, status: 'ACTIVE' } } },
        select: { id: true },
      });
      const childrenIds = children.map(c => c.id);

      const recentAttempts = await prisma.examAttempt.findMany({
        where: { studentId: { in: childrenIds }, exam: { organizationId: orgId } },
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: { startedAt: true, isCompleted: true, student: { select: { name: true } }, exam: { select: { title: true } } },
      });

      activities = recentAttempts.map(a => ({
        type: 'child_exam_attempt',
        title: `${a.student?.name} attempted exam: ${a.exam.title}`,
        timestamp: a.startedAt,
        status: a.isCompleted ? 'completed' : 'in_progress',
      }));
    }
    // Admins can implement full activity log if needed

    res.json({ success: true, data: activities });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent activity' });
  }
};