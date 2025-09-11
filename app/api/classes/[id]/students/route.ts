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

    const classId = params.id;
    const body = await req.json();
    const { studentIds } = body;

    if (!studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      );
    }

    // Check if the class exists and user has permission
    const classData = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Only creator or teacher can add students
    if (classData.createdById !== session.user.id && classData.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Add students to class
    const classStudents = await Promise.all(
      studentIds.map(studentId =>
        prisma.classStudent.create({
          data: {
            classId,
            studentId
          }
        }).catch(err => {
          // Ignore duplicate errors
          if (err.code === 'P2002') {
            return null;
          }
          throw err;
        })
      )
    );

    const addedCount = classStudents.filter(cs => cs !== null).length;

    return NextResponse.json({ 
      message: `${addedCount} students added to class`,
      addedCount 
    });
  } catch (error) {
    console.error('Error adding students to class:', error);
    return NextResponse.json(
      { error: 'Failed to add students to class' },
      { status: 500 }
    );
  }
}