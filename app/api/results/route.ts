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

    const userRole = session.user.role;
    let grades;
    let statistics = {
      totalExams: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 100,
      recentTrend: 'stable' as 'up' | 'down' | 'stable'
    };

    // Fetch results based on user role
    if (userRole === 'STUDENT') {
      // Students see only their own published results
      grades = await prisma.grade.findMany({
        where: {
          studentId: session.user.id,
          isPublished: true
        },
        include: {
          attempt: {
            include: {
              exam: true
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: {
          gradedAt: 'desc'
        }
      });
    } else if (userRole === 'PARENT') {
      // Parents see their children's published results
      const children = await prisma.user.findMany({
        where: {
          parentId: session.user.id,
          role: 'STUDENT'
        },
        select: { id: true }
      });

      const childrenIds = children.map(child => child.id);

      grades = await prisma.grade.findMany({
        where: {
          studentId: { in: childrenIds },
          isPublished: true
        },
        include: {
          attempt: {
            include: {
              exam: true
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: {
          gradedAt: 'desc'
        }
      });
    } else if (userRole === 'TEACHER') {
      // Teachers see results for students in their classes or students they created
      grades = await prisma.grade.findMany({
        where: {
          OR: [
            // Students created by this teacher
            {
              student: {
                createdById: session.user.id
              }
            },
            // Students in classes taught by this teacher
            {
              student: {
                classesAsStudent: {
                  some: {
                    class: {
                      teacherId: session.user.id
                    }
                  }
                }
              }
            },
            // Results for exams created by this teacher
            {
              attempt: {
                exam: {
                  creatorId: session.user.id
                }
              }
            }
          ]
        },
        include: {
          attempt: {
            include: {
              exam: true
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: {
          gradedAt: 'desc'
        }
      });
    } else if (userRole === 'ADMIN') {
      // Admins see all results
      grades = await prisma.grade.findMany({
        include: {
          attempt: {
            include: {
              exam: true
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: {
          gradedAt: 'desc'
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    }

    // Calculate statistics
    if (grades.length > 0) {
      statistics.totalExams = grades.length;
      
      const scores = grades.map(g => g.percentage);
      statistics.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      statistics.highestScore = Math.max(...scores);
      statistics.lowestScore = Math.min(...scores);

      // Calculate trend (compare last 5 results with previous 5)
      if (grades.length >= 10) {
        const recent5 = scores.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const previous5 = scores.slice(5, 10).reduce((a, b) => a + b, 0) / 5;
        
        if (recent5 > previous5 + 5) {
          statistics.recentTrend = 'up';
        } else if (recent5 < previous5 - 5) {
          statistics.recentTrend = 'down';
        }
      }
    }

    // Format results
    const results = grades.map(grade => ({
      id: grade.id,
      attemptId: grade.attemptId,
      exam: {
        id: grade.attempt.exam.id,
        title: grade.attempt.exam.title,
        subject: grade.attempt.exam.subject,
        gradeLevel: grade.attempt.exam.gradeLevel,
        totalMarks: grade.attempt.exam.totalMarks
      },
      student: grade.student,
      attempt: {
        submittedAt: grade.attempt.submittedAt,
        timeSpent: grade.attempt.timeSpent
      },
      totalScore: grade.totalScore,
      percentage: grade.percentage,
      grade: grade.grade,
      status: grade.status,
      gradedAt: grade.gradedAt,
      isPublished: grade.isPublished,
      publishedAt: grade.publishedAt
    }));

    return NextResponse.json({ results, statistics });
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}