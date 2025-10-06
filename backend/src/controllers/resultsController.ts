import { Request, Response } from 'express';
import { prisma } from '../utils/db';

export const getResults = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    let results: any[] = [];

    if (userRole === 'STUDENT') {
      // Get student's own exam results (both completed and in-progress)
      results = await prisma.examAttempt.findMany({
        where: { 
          studentId: userId
        },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              subject: true,
              totalMarks: true
            }
          },
          grade: true
        },
        orderBy: { startedAt: 'desc' }
      });
    } else if (userRole === 'TEACHER') {
      // Get results for exams created by teacher
      const teacherExams = await prisma.exam.findMany({
        where: { creatorId: userId },
        select: { id: true }
      });
      const examIds = teacherExams.map(e => e.id);

      results = await prisma.examAttempt.findMany({
        where: { examId: { in: examIds } },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              subject: true,
              totalMarks: true
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          grade: true
        },
        orderBy: { startedAt: 'desc' }
      });
    } else if (userRole === 'PARENT') {
      // Get children's results
      const children = await prisma.user.findMany({
        where: { parentId: userId },
        select: { id: true }
      });
      const childIds = children.map(c => c.id);

      results = await prisma.examAttempt.findMany({
        where: { studentId: { in: childIds } },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              subject: true,
              totalMarks: true
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          grade: true
        },
        orderBy: { startedAt: 'desc' }
      });
    } else if (userRole === 'ADMIN') {
      // Get all results
      results = await prisma.examAttempt.findMany({
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              subject: true,
              totalMarks: true
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          grade: true
        },
        orderBy: { startedAt: 'desc' },
        take: 100 // Limit for admin
      });
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results'
    });
  }
};

export const getResult = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const result = await prisma.examAttempt.findUnique({
      where: { id },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            subject: true,
            gradeLevel: true,
            totalMarks: true,
            creatorId: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            parentId: true
          }
        },
        grade: true,
        answers: {
          include: {
            question: true
          }
        }
      }
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // Check access permissions
    const hasAccess =
      userRole === 'ADMIN' ||
      (userRole === 'STUDENT' && result.studentId === userId) ||
      (userRole === 'TEACHER' && result.exam.creatorId === userId) ||
      (userRole === 'PARENT' && result.student.parentId === userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch result'
    });
  }
};

export const gradeResult = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { totalScore, percentage, grade, feedback } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId || (userRole !== 'TEACHER' && userRole !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can grade results'
      });
    }

    // Check if the exam attempt exists
    const attempt = await prisma.examAttempt.findUnique({
      where: { id },
      include: {
        exam: {
          select: { creatorId: true }
        }
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found'
      });
    }

    // Check if teacher owns the exam
    if (userRole === 'TEACHER' && attempt.exam.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only grade your own exams'
      });
    }

    // Create or update grade
    const gradedResult = await prisma.grade.upsert({
      where: { attemptId: id },
      update: {
        totalScore,
        percentage,
        grade,
        overallFeedback: feedback,
        status: 'COMPLETED'
      },
      create: {
        attemptId: id,
        studentId: attempt.studentId,
        totalScore,
        percentage,
        grade,
        overallFeedback: feedback,
        status: 'COMPLETED'
      }
    });

    // Mark attempt as graded
    await prisma.examAttempt.update({
      where: { id },
      data: { isGraded: true }
    });

    res.json({
      success: true,
      data: gradedResult
    });
  } catch (error) {
    console.error('Grade result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grade result'
    });
  }
};

export const publishResult = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId || (userRole !== 'TEACHER' && userRole !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can publish results'
      });
    }

    // Check if grade exists
    const grade = await prisma.grade.findFirst({
      where: { attemptId: id },
      include: {
        attempt: {
          include: {
            exam: {
              select: { creatorId: true }
            }
          }
        }
      }
    });

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found. Please grade the exam first.'
      });
    }

    // Check if teacher owns the exam
    if (userRole === 'TEACHER' && grade.attempt.exam.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only publish results for your own exams'
      });
    }

    // Publish the grade
    const publishedGrade = await prisma.grade.update({
      where: { id: grade.id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: userId
      }
    });

    res.json({
      success: true,
      data: publishedGrade
    });
  } catch (error) {
    console.error('Publish result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish result'
    });
  }
};

export const getStudentResults = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check access permissions
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        parentId: true,
        createdById: true
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const hasAccess =
      userRole === 'ADMIN' ||
      (userRole === 'STUDENT' && studentId === userId) ||
      (userRole === 'TEACHER' && student.createdById === userId) ||
      (userRole === 'PARENT' && student.parentId === userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get student's results
    const results = await prisma.examAttempt.findMany({
      where: { studentId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            subject: true,
            gradeLevel: true,
            totalMarks: true
          }
        },
        grade: {
          where: { isPublished: true }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    // Calculate statistics
    const grades = results
      .filter(r => r.grade)
      .map(r => r.grade!.percentage);

    const stats = {
      totalExams: results.length,
      completedExams: results.filter(r => r.isCompleted).length,
      gradedExams: results.filter(r => r.grade).length,
      averageScore: grades.length > 0
        ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
        : 0,
      highestScore: grades.length > 0 ? Math.max(...grades) : 0,
      lowestScore: grades.length > 0 ? Math.min(...grades) : 0
    };

    res.json({
      success: true,
      data: {
        results,
        stats
      }
    });
  } catch (error) {
    console.error('Get student results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student results'
    });
  }
};