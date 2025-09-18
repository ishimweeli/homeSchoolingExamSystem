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

    // Only teachers and parents can see all progress
    if (!['TEACHER', 'PARENT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all modules created by this teacher/parent
    const modules = await prisma.studyModule.findMany({
      where: { createdBy: session.user.id },
      select: { id: true }
    });

    const moduleIds = modules.map(m => m.id);

    // Get all assignments for these modules
    const assignments = await prisma.studyModuleAssignment.findMany({
      where: {
        moduleId: { in: moduleIds }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        module: {
          select: {
            id: true,
            title: true,
            totalLessons: true,
            subject: true,
            gradeLevel: true
          }
        }
      },
      orderBy: [
        { module: { title: 'asc' } },
        { student: { name: 'asc' } }
      ]
    });

    // Calculate status for each assignment
    const assignmentsWithStatus = assignments.map(assignment => {
      let status = 'NOT_STARTED';

      if (assignment.status === 'COMPLETED') {
        status = 'COMPLETED';
      } else if (assignment.overallProgress > 0) {
        status = 'IN_PROGRESS';
        // Check if overdue
        if (assignment.dueDate && new Date(assignment.dueDate) < new Date()) {
          status = 'OVERDUE';
        }
      } else if (assignment.dueDate && new Date(assignment.dueDate) < new Date()) {
        status = 'OVERDUE';
      }

      return {
        ...assignment,
        status
      };
    });

    return NextResponse.json({
      assignments: assignmentsWithStatus
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}