import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    if (userRole === 'STUDENT') {
      // Get student-specific statistics
      
      // Get all assigned exams
      const assignedExams = await prisma.examAssignment.findMany({
        where: { studentId: userId },
        include: {
          exam: true
        }
      });

      // Get all exam attempts
      const attempts = await prisma.examAttempt.findMany({
        where: { studentId: userId },
        include: {
          exam: true,
          grade: true
        }
      });

      // Get completed exams with grades
      const completedExams = attempts.filter(a => a.isCompleted);
      
      // Calculate average score
      const grades = await prisma.grade.findMany({
        where: { 
          studentId: userId,
          isPublished: true 
        }
      });
      
      const averageScore = grades.length > 0
        ? grades.reduce((sum, g) => sum + (g.percentage || 0), 0) / grades.length
        : 0;

      // Get upcoming exams (assigned but not attempted)
      const attemptedExamIds = attempts.map(a => a.examId);
      const upcomingExams = assignedExams.filter(
        a => !attemptedExamIds.includes(a.examId) && a.isActive
      );

      // Get recent activity (last 5 results)
      const recentActivity = await prisma.grade.findMany({
        where: { 
          studentId: userId,
          isPublished: true
        },
        include: {
          attempt: {
            include: {
              exam: true
            }
          }
        },
        orderBy: { gradedAt: 'desc' },
        take: 5
      });

      return NextResponse.json({
        stats: {
          totalExams: assignedExams.length,
          completedExams: completedExams.length,
          averageScore: Math.round(averageScore),
          upcomingExams: upcomingExams.length
        },
        recentActivity: recentActivity.map(grade => ({
          id: grade.id,
          title: grade.attempt.exam.title,
          subject: grade.attempt.exam.subject,
          score: grade.percentage || 0,
          date: grade.gradedAt,
          grade: grade.grade
        }))
      });

    } else if (userRole === 'TEACHER' || userRole === 'PARENT') {
      // Get teacher/parent-specific statistics
      
      // Get all created exams
      const createdExams = await prisma.exam.findMany({
        where: { creatorId: userId }
      });

      // Get all students
      let students = [];
      if (userRole === 'TEACHER') {
        // Get students from classes
        const classes = await prisma.class.findMany({
          where: { teacherId: userId },
          include: {
            students: {
              include: {
                student: true
              }
            }
          }
        });
        
        const studentIds = new Set();
        classes.forEach(c => {
          c.students.forEach(s => studentIds.add(s.studentId));
        });
        
        students = await prisma.user.findMany({
          where: { 
            id: { in: Array.from(studentIds) as string[] }
          }
        });
      } else {
        // Get children for parent
        students = await prisma.user.findMany({
          where: { parentId: userId }
        });
      }

      // Get all grades for these students
      const studentIds = students.map(s => s.id);
      const grades = await prisma.grade.findMany({
        where: { 
          studentId: { in: studentIds },
          isPublished: true
        }
      });

      const averageScore = grades.length > 0
        ? grades.reduce((sum, g) => sum + (g.percentage || 0), 0) / grades.length
        : 0;

      // Get pending gradings
      const pendingGrades = await prisma.grade.count({
        where: {
          status: 'PENDING',
          attempt: {
            exam: {
              creatorId: userId
            }
          }
        }
      });

      // Get recent activity
      const recentActivity = await prisma.grade.findMany({
        where: {
          attempt: {
            exam: {
              creatorId: userId
            }
          }
        },
        include: {
          student: true,
          attempt: {
            include: {
              exam: true
            }
          }
        },
        orderBy: { gradedAt: 'desc' },
        take: 5
      });

      return NextResponse.json({
        stats: {
          totalExams: createdExams.length,
          totalStudents: students.length,
          averageScore: Math.round(averageScore),
          pendingGrading: pendingGrades
        },
        recentActivity: recentActivity.map(grade => ({
          id: grade.id,
          title: grade.attempt.exam.title,
          studentName: grade.student.name || grade.student.username || 'Unknown',
          score: grade.percentage || 0,
          date: grade.gradedAt,
          status: grade.status
        }))
      });

    } else {
      // Admin statistics
      const totalUsers = await prisma.user.count();
      const totalExams = await prisma.exam.count();
      const totalAttempts = await prisma.examAttempt.count();
      
      return NextResponse.json({
        stats: {
          totalUsers,
          totalExams,
          totalAttempts,
          activeExams: await prisma.exam.count({ where: { status: 'ACTIVE' } })
        },
        recentActivity: []
      });
    }

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}