import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: classId, studentId } = params;

    // Check if the class exists and user has permission
    const classData = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Only creator or teacher can remove students
    if (classData.createdById !== session.user.id && classData.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Remove student from class
    await prisma.classStudent.deleteMany({
      where: {
        classId,
        studentId
      }
    });

    return NextResponse.json({ message: 'Student removed from class' });
  } catch (error) {
    console.error('Error removing student from class:', error);
    return NextResponse.json(
      { error: 'Failed to remove student from class' },
      { status: 500 }
    );
  }
}