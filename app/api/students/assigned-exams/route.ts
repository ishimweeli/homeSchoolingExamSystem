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

    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden - Students only' }, { status: 403 });
    }

    // Fetch all exam assignments for the student
    const assignments = await prisma.examAssignment.findMany({
      where: {
        OR: [
          // Direct assignments to the student
          { studentId: session.user.id },
          // Class-based assignments
          {
            class: {
              students: {
                some: {
                  studentId: session.user.id
                }
              }
            }
          }
        ],
        isActive: true
      },
      include: {
        exam: {
          include: {
            questions: {
              select: {
                id: true,
                type: true,
                marks: true
              }
            }
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Get attempt counts for each exam
    const assignmentsWithAttempts = await Promise.all(
      assignments.map(async (assignment) => {
        const attempts = await prisma.examAttempt.findMany({
          where: {
            examId: assignment.exam.id,
            studentId: session.user.id
          },
          orderBy: {
            submittedAt: 'desc'
          },
          take: 1,
          include: {
            grade: {
              select: {
                totalScore: true,
                percentage: true
              }
            }
          }
        });

        const attemptCount = await prisma.examAttempt.count({
          where: {
            examId: assignment.exam.id,
            studentId: session.user.id
          }
        });

        return {
          ...assignment,
          attemptCount,
          lastAttempt: attempts[0] ? {
            submittedAt: attempts[0].submittedAt,
            score: attempts[0].grade?.percentage
          } : null
        };
      })
    );

    return NextResponse.json(assignmentsWithAttempts);
  } catch (error) {
    console.error('Error fetching assigned exams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assigned exams' },
      { status: 500 }
    );
  }
}