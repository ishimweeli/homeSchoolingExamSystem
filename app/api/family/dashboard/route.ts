import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents/teachers can access family dashboard
    if (!['PARENT', 'TEACHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all children/students under this parent/teacher
    const children = await prisma.user.findMany({
      where: {
        OR: [
          { parentId: session.user.id }, // Direct parent relationship
          { 
            classesAsStudent: {
              some: {
                class: {
                  teacherId: session.user.id // Students in teacher's classes
                }
              }
            }
          }
        ]
      },
      include: {
        examAttempts: {
          where: {
            isCompleted: true,
            submittedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          include: {
            grade: true
          }
        },
        assignedExams: {
          where: {
            isActive: true,
            dueDate: {
              gte: new Date() // Only future/current assignments
            }
          }
        }
      }
    });

    // Process children data
    const processedChildren = children.map(child => {
      const recentAttempts = child.examAttempts;
      const averageScore = recentAttempts.length > 0 
        ? recentAttempts.reduce((sum, attempt) => sum + (attempt.grade?.percentage || 0), 0) / recentAttempts.length
        : 0;

      const totalStudyTime = recentAttempts.reduce((sum, attempt) => sum + (attempt.timeSpent || 0), 0);
      
      const upcomingDeadlines = child.assignedExams.filter(assignment => {
        const dueDate = new Date(assignment.dueDate || '');
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return dueDate <= threeDaysFromNow;
      }).length;

      const lastActivity = recentAttempts.length > 0 
        ? recentAttempts.sort((a, b) => new Date(b.submittedAt || '').getTime() - new Date(a.submittedAt || '').getTime())[0].submittedAt
        : null;

      return {
        id: child.id,
        name: child.name,
        firstName: child.firstName,
        lastName: child.lastName,
        gradeLevel: getGradeLevelFromAge(child), // You might want to add age/grade to User model
        recentActivity: {
          examsCompleted: recentAttempts.length,
          averageScore: Math.round(averageScore * 10) / 10,
          timeSpent: totalStudyTime,
          lastActivity: lastActivity ? formatRelativeTime(lastActivity.toISOString()) : 'No recent activity'
        },
        currentAssignments: child.assignedExams.length,
        upcomingDeadlines
      };
    });

    // Calculate family stats
    const familyStats = {
      totalChildren: children.length,
      totalExamsCompleted: children.reduce((sum, child) => sum + child.examAttempts.length, 0),
      averageFamilyScore: children.length > 0 
        ? children.reduce((sum, child) => {
            const childAvg = child.examAttempts.length > 0 
              ? child.examAttempts.reduce((s, a) => s + (a.grade?.percentage || 0), 0) / child.examAttempts.length
              : 0;
            return sum + childAvg;
          }, 0) / children.length
        : 0,
      totalStudyTime: children.reduce((sum, child) => 
        sum + child.examAttempts.reduce((s, a) => s + (a.timeSpent || 0), 0), 0
      ),
      weeklyProgress: await getWeeklyProgress(session.user.id)
    };

    return NextResponse.json({
      children: processedChildren,
      familyStats: {
        ...familyStats,
        averageFamilyScore: Math.round(familyStats.averageFamilyScore * 10) / 10
      }
    });

  } catch (error) {
    console.error('Family dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family dashboard data' },
      { status: 500 }
    );
  }
}

function getGradeLevelFromAge(user: any): number {
  // This is a placeholder - you might want to add actual grade level to your User model
  // For now, we'll return a default or calculate from age if available
  return 7; // Default grade level
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString();
}

async function getWeeklyProgress(userId: string) {
  try {
    // Get weekly progress for the last 4 weeks - FIXED QUERY
    const fourWeeksAgo = new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000);
    
    // Get exam attempts with grades for weekly progress
    const weeklyAttempts = await prisma.examAttempt.findMany({
      where: {
        student: {
          OR: [
            { parentId: userId },
            {
              classesAsStudent: {
                some: {
                  class: {
                    teacherId: userId
                  }
                }
              }
            }
          ]
        },
        isCompleted: true,
        submittedAt: {
          gte: fourWeeksAgo
        }
      },
      include: {
        grade: true
      }
    });

    // Process into weekly buckets using real data
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Filter attempts for this week
      const weekAttempts = weeklyAttempts.filter(attempt => {
        if (!attempt.submittedAt) return false;
        const attemptDate = new Date(attempt.submittedAt);
        return attemptDate >= weekStart && attemptDate < weekEnd;
      });

      const averageScore = weekAttempts.length > 0 
        ? weekAttempts.reduce((sum, attempt) => sum + (attempt.grade?.percentage || 0), 0) / weekAttempts.length
        : 0;

      weeks.push({
        week: `Week ${4 - i}`,
        completed: weekAttempts.length,
        average: Math.round(averageScore * 10) / 10
      });
    }

    return weeks;
  } catch (error) {
    console.error('Weekly progress error:', error);
    return [];
  }
}