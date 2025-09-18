import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch assignment record which contains progress
    const assignment = await prisma.studyModuleAssignment.findFirst({
      where: {
        moduleId: params.id,
        studentId: session.user.id
      }
    });

    if (!assignment) {
      // Return default progress if no assignment
      return NextResponse.json({
        currentLesson: 0,
        currentStep: 0,
        totalXP: 0,
        livesRemaining: 3,
        streak: 0,
        completedLessons: [],
        badges: []
      });
    }

    // Transform assignment data to frontend format
    const userProgress = {
      currentLesson: assignment.currentLesson - 1, // Convert to 0-indexed
      currentStep: assignment.currentStep - 1,
      totalXP: assignment.totalXp || 0,
      livesRemaining: assignment.lives || 3,
      streak: assignment.streak || 0,
      completedLessons: [], // TODO: Track completed lessons
      badges: []
    };

    return NextResponse.json(userProgress);

  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      currentLesson,
      currentStep,
      totalXP,
      livesRemaining,
      streak,
      completedLessons
    } = body;

    // Update assignment progress
    const assignment = await prisma.studyModuleAssignment.updateMany({
      where: {
        moduleId: params.id,
        studentId: session.user.id
      },
      data: {
        currentLesson: currentLesson + 1, // Convert from 0-indexed
        currentStep: currentStep + 1,
        totalXp: totalXP,
        lives: livesRemaining,
        streak,
        lastActiveAt: new Date(),
        overallProgress: Math.floor((currentLesson / 5 + currentStep / 25) * 100) // Rough progress calculation
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving progress:', error);
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}