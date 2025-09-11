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

    const userRole = session.user.role;
    let portfolios;

    // Fetch portfolios based on user role
    if (userRole === 'STUDENT') {
      // Students see only their own portfolios
      portfolios = await prisma.portfolio.findMany({
        where: {
          studentId: session.user.id
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              username: true
            }
          },
          _count: {
            select: {
              items: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    } else if (userRole === 'PARENT') {
      // Parents see their children's portfolios
      const children = await prisma.user.findMany({
        where: {
          parentId: session.user.id,
          role: 'STUDENT'
        },
        select: { id: true }
      });

      const childrenIds = children.map(child => child.id);

      portfolios = await prisma.portfolio.findMany({
        where: {
          studentId: { in: childrenIds }
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              username: true
            }
          },
          _count: {
            select: {
              items: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    } else if (userRole === 'TEACHER') {
      // Teachers see portfolios for students in their classes or students they created
      portfolios = await prisma.portfolio.findMany({
        where: {
          OR: [
            // Students created by this teacher
            {
              student: {
                createdById: session.user.id
              }
            },
            // Students in classes taught by this teacher
            {
              student: {
                classesAsStudent: {
                  some: {
                    class: {
                      teacherId: session.user.id
                    }
                  }
                }
              }
            }
          ]
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              username: true
            }
          },
          _count: {
            select: {
              items: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    } else if (userRole === 'ADMIN') {
      // Admins see all portfolios
      portfolios = await prisma.portfolio.findMany({
        include: {
          student: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              username: true
            }
          },
          _count: {
            select: {
              items: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    }

    return NextResponse.json(portfolios);
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
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

    const body = await req.json();
    const { title, description, isPublic, studentId } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Determine the actual student ID
    let actualStudentId = studentId;
    if (session.user.role === 'STUDENT') {
      actualStudentId = session.user.id;
    } else if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // For teachers and parents, verify they have permission to create portfolios for this student
    if (session.user.role === 'TEACHER') {
      const hasPermission = await prisma.user.findFirst({
        where: {
          id: actualStudentId,
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
        }
      });

      if (!hasPermission) {
        return NextResponse.json({ error: 'Not authorized to create portfolio for this student' }, { status: 403 });
      }
    } else if (session.user.role === 'PARENT') {
      const child = await prisma.user.findFirst({
        where: {
          id: actualStudentId,
          parentId: session.user.id
        }
      });

      if (!child) {
        return NextResponse.json({ error: 'Not authorized to create portfolio for this student' }, { status: 403 });
      }
    }

    // Create the portfolio
    const portfolio = await prisma.portfolio.create({
      data: {
        title,
        description,
        isPublic,
        studentId: actualStudentId
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Error creating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}