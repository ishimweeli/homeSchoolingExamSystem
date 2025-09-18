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

    // Only teachers and parents can see students
    if (!['TEACHER', 'PARENT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let students;

    if (session.user.role === 'PARENT') {
      // Parents see their own children
      students = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          parentId: session.user.id
        },
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          createdAt: true
        },
        orderBy: {
          name: 'asc'
        }
      });
    } else {
      // Teachers and admins see all students
      students = await prisma.user.findMany({
        where: {
          role: 'STUDENT'
        },
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          parentId: true,
          parent: {
            select: {
              name: true
            }
          },
          createdAt: true
        },
        orderBy: {
          name: 'asc'
        }
      });
    }

    return NextResponse.json({
      students
    });

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

    // Only teachers, parents, and admins can create students
    if (!['TEACHER', 'PARENT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, firstName, lastName, username } = body;

    // Use either name or firstName/lastName
    const studentName = name || `${firstName || ''} ${lastName || ''}`.trim();
    const studentEmail = email;
    const studentUsername = username || email?.split('@')[0];

    if (!studentName || !password) {
      return NextResponse.json({ error: 'Name and password required' }, { status: 400 });
    }

    // Check if email or username already exists
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    if (studentUsername) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: studentUsername }
      });
      if (existingUsername) {
        return NextResponse.json({ error: 'Username already in use' }, { status: 400 });
      }
    }

    // Hash the password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const student = await prisma.user.create({
      data: {
        name: studentName,
        firstName: firstName || null,
        lastName: lastName || null,
        email: studentEmail || null,
        username: studentUsername || null,
        password: hashedPassword,
        role: 'STUDENT',
        parentId: session.user.role === 'PARENT' ? session.user.id : null,
        createdById: session.user.id,
        emailVerified: new Date() // Auto-verify students created by teachers/parents
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      student
    });

  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}