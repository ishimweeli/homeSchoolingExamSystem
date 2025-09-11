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

    // Only teachers and admins can publish results
    if (!['TEACHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Not authorized to publish results' }, { status: 403 });
    }

    const attemptId = params.id;

    // Find the grade
    const grade = await prisma.grade.findUnique({
      where: { attemptId },
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
            email: true,
            parentId: true,
            parent: {
              select: {
                email: true,
                name: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!grade) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Check if user has permission to publish this result
    const isTeacherAuthorized = session.user.role === 'TEACHER' && (
      grade.attempt.exam.creatorId === session.user.id ||
      await prisma.class.findFirst({
        where: {
          teacherId: session.user.id,
          students: {
            some: {
              studentId: grade.studentId
            }
          }
        }
      })
    );

    if (session.user.role === 'TEACHER' && !isTeacherAuthorized) {
      return NextResponse.json({ error: 'Not authorized to publish this result' }, { status: 403 });
    }

    // Update grade to published
    const publishedGrade = await prisma.grade.update({
      where: { attemptId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: session.user.id
      }
    });

    // TODO: Send notification to student and parent
    // This would typically integrate with an email service or push notification system
    console.log(`Result published for student ${grade.student.id}, exam: ${grade.attempt.exam.title}`);

    return NextResponse.json({
      message: 'Result published successfully',
      publishedAt: publishedGrade.publishedAt
    });
  } catch (error) {
    console.error('Error publishing result:', error);
    return NextResponse.json(
      { error: 'Failed to publish result' },
      { status: 500 }
    );
  }
}

// Unpublish result
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only teachers and admins can unpublish results
    if (!['TEACHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const attemptId = params.id;

    const updatedGrade = await prisma.grade.update({
      where: { attemptId },
      data: {
        isPublished: false,
        publishedAt: null,
        publishedBy: null
      }
    });

    return NextResponse.json({
      message: 'Result unpublished successfully'
    });
  } catch (error) {
    console.error('Error unpublishing result:', error);
    return NextResponse.json(
      { error: 'Failed to unpublish result' },
      { status: 500 }
    );
  }
}