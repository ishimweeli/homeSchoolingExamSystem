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

    // Only teachers, parents, and admins can grade
    if (!['TEACHER', 'PARENT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { grades, totalScore, status, feedback } = body;

    // Check if grade/result exists
    const grade = await prisma.grade.findUnique({
      where: { attemptId: params.id },
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
        student: true,
      }
    });

    if (!grade) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    const result = {
      id: grade.id,
      examId: grade.attempt.examId,
      exam: grade.attempt.exam,
      studentId: grade.studentId,
      student: grade.student,
      maxScore: grade.attempt.exam.totalMarks,
    };

    // Check authorization
    if (session.user.role === 'TEACHER') {
      // Teachers can only grade exams they created
      if (result.exam.creatorId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.user.role === 'PARENT') {
      // Parents can only grade their children's exams
      const isParent = await prisma.user.findFirst({
        where: {
          id: result.studentId,
          parentId: session.user.id
        }
      });
      
      if (!isParent) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Update the grade with scores
    const updatedGrade = await prisma.grade.update({
      where: { attemptId: params.id },
      data: {
        totalScore: totalScore,
        status: status || 'COMPLETED',
        overallFeedback: feedback,
        percentage: Math.round((totalScore / result.maxScore) * 100),
        isPublished: true,
        publishedAt: new Date(),
      },
      include: {
        attempt: {
          include: {
            exam: true,
          }
        },
        student: true,
      }
    });

    // Calculate percentage and grade
    const percentage = Math.round((totalScore / result.maxScore) * 100);
    const letterGrade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';

    // Send notification to student (optional - implement notification system)
    // await sendNotification(result.studentId, `Your exam "${result.exam.title}" has been graded. Score: ${percentage}%`);

    return NextResponse.json({
      ...updatedGrade,
      percentage,
      grade: letterGrade,
      message: 'Exam graded successfully'
    });

  } catch (error) {
    console.error('Error grading exam:', error);
    return NextResponse.json(
      { error: 'Failed to grade exam' },
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

    // First check if grade exists, if not create it
    let grade = await prisma.grade.findUnique({
      where: { attemptId: params.id },
      include: {
        attempt: {
          include: {
            exam: {
              include: {
                questions: true,
              }
            },
            answers: true,
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    });

    // If grade doesn't exist, check if attempt exists and create grade
    if (!grade) {
      const attempt = await prisma.examAttempt.findUnique({
        where: { id: params.id },
        include: {
          exam: {
            include: {
              questions: true,
            }
          },
          answers: true,
          student: true
        }
      });

      if (!attempt) {
        return NextResponse.json({ error: 'Exam attempt not found' }, { status: 404 });
      }

      // Create a new grade entry
      grade = await prisma.grade.create({
        data: {
          attemptId: params.id,
          studentId: attempt.studentId,
          totalScore: 0,
          percentage: 0,
          status: 'PENDING',
          isPublished: false
        },
        include: {
          attempt: {
            include: {
              exam: {
                include: {
                  questions: true,
                }
              },
              answers: true,
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      });
    }

    if (!grade) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    const result = {
      id: grade.id,
      examId: grade.attempt.examId,
      exam: grade.attempt.exam,
      studentId: grade.studentId,
      student: grade.student,
      answers: grade.attempt.answers,
      score: grade.totalScore,
      maxScore: (grade as any).maxScore || 100,
      status: grade.status,
      feedback: (grade as any).feedback || null,
      submittedAt: grade.attempt.submittedAt,
      gradedAt: (grade as any).createdAt || new Date(),
    };

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Check authorization
    const userRole = session.user.role;
    
    if (userRole === 'STUDENT') {
      // Students can only view their own results
      if (result.studentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (userRole === 'TEACHER') {
      // Teachers can only view results for exams they created
      if (result.exam.creatorId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (userRole === 'PARENT') {
      // Parents can only view their children's results
      const isParent = await prisma.user.findFirst({
        where: {
          id: result.studentId,
          parentId: session.user.id
        }
      });
      
      if (!isParent) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Format the response
    const formattedResult = {
      id: grade.id,
      examId: result.examId,
      examTitle: result.exam.title,
      studentId: result.studentId,
      studentName: result.student.firstName && result.student.lastName
        ? `${result.student.firstName} ${result.student.lastName}`
        : result.student.name || (result.student as any).username || 'Unknown Student',
      questions: result.exam.questions.map(q => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.marks || 1,
        explanation: q.sampleAnswer || null,
      })),
      answers: result.answers.map(answer => {
        const question = result.exam.questions.find(q => q.id === answer.questionId);
        return {
          questionId: answer.questionId,
          answer: answer.answer,
          isCorrect: answer.finalScore === (question?.marks || 0),
          points: answer.finalScore || 0,
        };
      }),
      totalScore: result.score || 0,
      maxScore: result.maxScore,
      status: result.status,
      feedback: result.feedback,
      submittedAt: result.submittedAt,
      gradedAt: result.gradedAt,
    };

    return NextResponse.json(formattedResult);

  } catch (error) {
    console.error('Error fetching result for grading:', error);
    return NextResponse.json(
      { error: 'Failed to fetch result' },
      { status: 500 }
    );
  }
}