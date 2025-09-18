import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attemptId = params.id;

    // Fetch the grade with full details
    const grade = await prisma.grade.findUnique({
      where: { attemptId },
      include: {
        attempt: {
          include: {
            exam: {
              include: {
                questions: true
              }
            },
            answers: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            parentId: true
          }
        }
      }
    });

    if (!grade) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Check access permissions
    const userRole = session.user.role;
    
    // Check if results are not published yet for students/parents
    if ((userRole === 'STUDENT' || userRole === 'PARENT') && !grade.isPublished) {
      return NextResponse.json({ 
        error: 'Results not published',
        message: 'Your exam has been submitted successfully. Results will be available once your teacher reviews and publishes them.',
        status: 'pending_review'
      }, { status: 200 });
    }
    
    const hasAccess = 
      userRole === 'ADMIN' ||
      (userRole === 'STUDENT' && grade.studentId === session.user.id) ||
      (userRole === 'PARENT' && grade.student.parentId === session.user.id) ||
      (userRole === 'TEACHER' && (
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
      ));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Format the detailed result
    const detailedResult = {
      id: grade.id,
      attemptId: grade.attemptId,
      exam: {
        id: grade.attempt.exam.id,
        title: grade.attempt.exam.title,
        description: grade.attempt.exam.description,
        subject: grade.attempt.exam.subject,
        gradeLevel: grade.attempt.exam.gradeLevel,
        totalMarks: grade.attempt.exam.totalMarks,
        duration: grade.attempt.exam.duration,
        questions: grade.attempt.exam.questions.map(q => ({
          id: q.id,
          question: q.question,
          type: q.type,
          marks: q.marks,
          correctAnswer: q.correctAnswer,
          options: q.options
        }))
      },
      student: grade.student,
      attempt: {
        startedAt: grade.attempt.startedAt,
        submittedAt: grade.attempt.submittedAt,
        timeSpent: grade.attempt.timeSpent
      },
      answers: grade.attempt.answers.map(a => ({
        id: a.id,
        questionId: a.questionId,
        answer: a.answer,
        aiScore: a.aiScore,
        aiFeedback: a.aiFeedback,
        manualScore: a.manualScore,
        manualFeedback: a.manualFeedback,
        finalScore: a.finalScore
      })),
      totalScore: grade.totalScore,
      percentage: grade.percentage,
      grade: grade.grade,
      status: grade.status,
      overallFeedback: grade.overallFeedback,
      aiAnalysis: grade.aiAnalysis
    };

    return NextResponse.json(detailedResult);
  } catch (error) {
    console.error('Error fetching detailed result:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detailed result' },
      { status: 500 }
    );
  }
}