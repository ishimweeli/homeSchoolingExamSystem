import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only teachers and parents can assign modules
    if (!['TEACHER', 'PARENT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { studentIds, dueDate, instructions } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Student IDs required' }, { status: 400 });
    }

    // Verify the module exists and belongs to the teacher
    const module = await prisma.studyModule.findFirst({
      where: {
        id: params.id,
        createdBy: session.user.id
      }
    });

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Create assignments for each student
    const assignments = await Promise.all(
      studentIds.map(async (studentId: string) => {
        // Check if assignment already exists
        const existing = await prisma.studyModuleAssignment.findFirst({
          where: {
            moduleId: params.id,
            studentId: studentId
          }
        });

        if (existing) {
          return existing; // Return existing assignment
        }

        // Create new assignment
        return await prisma.studyModuleAssignment.create({
          data: {
            moduleId: params.id,
            studentId: studentId,
            assignedBy: session.user.id,
            dueDate: dueDate ? new Date(dueDate) : null,
            instructions: instructions || null
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
                totalLessons: true
              }
            }
          }
        });
      })
    );

    return NextResponse.json({
      success: true,
      assignments,
      message: `Study module assigned to ${studentIds.length} student(s)`
    });

  } catch (error) {
    console.error('Error assigning study module:', error);
    return NextResponse.json(
      { error: 'Failed to assign study module' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all assignments for this module
    const assignments = await prisma.studyModuleAssignment.findMany({
      where: {
        moduleId: params.id,
        ...(session.user.role === 'STUDENT' 
          ? { studentId: session.user.id }
          : { assignedBy: session.user.id })
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
            totalLessons: true
          }
        }
      }
    });

    return NextResponse.json({
      assignments
    });

  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}