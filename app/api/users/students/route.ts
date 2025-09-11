import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    let students;

    if (userRole === 'ADMIN') {
      // Admins can see all students
      students = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          name: true,
        }
      });
    } else if (userRole === 'TEACHER') {
      // Teachers can see students they created or in their classes
      students = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          OR: [
            { createdById: session.user.id },
            {
              classesAsStudent: {
                some: {
                  class: {
                    teacherId: session.user.id
                  }
                }
              }
            }
          ]
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          name: true,
        }
      });
    } else if (userRole === 'PARENT') {
      // Parents can see their children
      students = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          parentId: session.user.id
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          name: true,
        }
      });
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    
    // Only teachers, parents, and admins can create students
    if (!['ADMIN', 'TEACHER', 'PARENT'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, username, password, email } = body;

    // Validate required fields
    if (!firstName || !lastName || !username || !password) {
      return NextResponse.json(
        { error: 'First name, last name, username, and password are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const student = await prisma.user.create({
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        username,
        password: hashedPassword,
        email: email || null,
        role: 'STUDENT',
        createdById: session.user.id,
        parentId: userRole === 'PARENT' ? session.user.id : undefined,
        emailVerified: new Date(), // Auto-verify students created by teachers/parents
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        name: true,
      }
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}