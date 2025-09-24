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

    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can take exams' }, { status: 403 });
    }

    const examId = params.id;

    // Check if student is assigned to this exam
    const assignment = await prisma.examAssignment.findFirst({
      where: {
        examId,
        OR: [
          { studentId: session.user.id },
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
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'You are not assigned to this exam' }, { status: 403 });
    }

    // Subscription gating
    const sub = await prisma.subscription.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: { tier: true }
    });

    if (!sub) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 402 });
    }

    // Check attempts allowed by tier
    if (sub.tier.maxAttemptsPerExam > 0) {
      const currentAttemptsForExam = await prisma.examAttempt.count({
        where: { examId, studentId: session.user.id }
      });
      if (currentAttemptsForExam >= sub.tier.maxAttemptsPerExam) {
        return NextResponse.json({ error: 'Attempt limit reached for your tier' }, { status: 403 });
      }
    }

    // Check attempt limits
    const attemptCount = await prisma.examAttempt.count({
      where: {
        examId,
        studentId: session.user.id
      }
    });

    if (attemptCount >= assignment.maxAttempts) {
      return NextResponse.json({ error: 'Maximum attempts reached' }, { status: 403 });
    }

    // Check dates
    const now = new Date();
    if (assignment.startDate && new Date(assignment.startDate) > now) {
      return NextResponse.json({ error: 'Exam is not yet available' }, { status: 403 });
    }

    if (assignment.dueDate && new Date(assignment.dueDate) < now && !assignment.allowLateSubmission) {
      return NextResponse.json({ error: 'Exam is past due date' }, { status: 403 });
    }

    // Create exam attempt
    const attempt = await prisma.examAttempt.create({
      data: {
        examId,
        studentId: session.user.id,
        startedAt: new Date()
      }
    });

    return NextResponse.json(attempt);
  } catch (error) {
    console.error('Error creating exam attempt:', error);
    return NextResponse.json(
      { error: 'Failed to start exam' },
      { status: 500 }
    );
  }
}