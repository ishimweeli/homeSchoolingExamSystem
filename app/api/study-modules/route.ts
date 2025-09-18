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

    let modules;
    let stats = {
      totalXP: 0,
      streak: 0,
      completedModules: 0,
      badges: 0
    };

    if (userRole === 'STUDENT') {
      // Students see only assigned modules with their progress
      const assignments = await prisma.studyModuleAssignment.findMany({
        where: { studentId: userId },
        include: {
          module: {
            include: {
              lessons: {
                include: {
                  steps: true
                }
              }
            }
          }
        }
      });

      // Map assignments to modules with progress
      modules = assignments.map(assignment => ({
        ...assignment.module,
        assignment: {
          dueDate: assignment.dueDate,
          instructions: assignment.instructions
        },
        progress: {
          currentLessonNumber: assignment.currentLesson,
          currentStepNumber: assignment.currentStep,
          totalXP: assignment.totalXp || 0,
          livesRemaining: assignment.lives || 3,
          streak: assignment.streak || 0,
          overallProgress: assignment.overallProgress || 0,
          completedSteps: []
        }
      }));

      // Calculate stats from assignments
      stats.totalXP = assignments.reduce((sum, a) => sum + (a.totalXp || 0), 0);
      stats.streak = Math.max(...assignments.map(a => a.streak || 0), 0);
      stats.completedModules = assignments.filter(a => a.status === 'COMPLETED').length;
      // TODO: Implement badges
      
    } else {
      // Teachers/Parents see all modules they created
      modules = await prisma.studyModule.findMany({
        where: { createdBy: userId },
        include: {
          lessons: true,
          assignments: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({
      modules,
      stats
    });

  } catch (error) {
    console.error('Error fetching study modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch study modules' },
      { status: 500 }
    );
  }
}