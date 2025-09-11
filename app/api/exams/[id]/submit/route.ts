import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OpenAI } from 'openai';

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
      return NextResponse.json({ error: 'Only students can submit exams' }, { status: 403 });
    }

    const examId = params.id;
    const body = await req.json();
    const { attemptId, answers } = body;

    let attempt;
    
    if (attemptId) {
      // Verify the attempt belongs to this student
      attempt = await prisma.examAttempt.findUnique({
        where: { id: attemptId },
        include: {
          exam: {
            include: {
              questions: true
            }
          }
        }
      });

      if (!attempt || attempt.studentId !== session.user.id) {
        return NextResponse.json({ error: 'Invalid attempt' }, { status: 403 });
      }

      if (attempt.isCompleted) {
        return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 });
      }
    } else {
      // Create a new attempt if attemptId is not provided
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: {
          questions: true
        }
      });

      if (!exam) {
        return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
      }

      // Check if student has assignment for this exam
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

      // Create new attempt
      attempt = await prisma.examAttempt.create({
        data: {
          examId,
          studentId: session.user.id,
          startedAt: new Date()
        },
        include: {
          exam: {
            include: {
              questions: true
            }
          }
        }
      });
    }

    const finalAttemptId = attempt.id;

    // Initialize OpenAI if API key is available
    let openai: OpenAI | null = null;
    if (process.env.OPENAI_API_KEY) {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Process and grade each answer
    const answerRecords = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const question of attempt.exam.questions) {
      maxScore += question.marks;
      
      const studentAnswer = answers.find((a: any) => a.questionId === question.id);
      let score = 0;
      let aiFeedback = null;
      let aiScore = null;
      
      if (studentAnswer) {
        // Grade based on question type
        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
          // Simple comparison for objective questions
          const correctAnswer = question.correctAnswer as string;
          if (studentAnswer.answer === correctAnswer) {
            score = question.marks;
            aiFeedback = 'Correct answer!';
          } else {
            score = 0;
            aiFeedback = `Incorrect. The correct answer is: ${correctAnswer}`;
          }
          aiScore = score;
        } else if (openai && ['SHORT_ANSWER', 'LONG_ANSWER', 'FILL_BLANKS'].includes(question.type)) {
          // Use AI for subjective questions
          try {
            const gradingPrompt = `
              Grade the following student answer:
              
              Question: ${question.question}
              Correct Answer/Expected Answer: ${JSON.stringify(question.correctAnswer)}
              Student Answer: ${studentAnswer.answer}
              Maximum Marks: ${question.marks}
              
              Provide:
              1. A score out of ${question.marks}
              2. Brief feedback (2-3 sentences)
              
              Consider partial credit for partially correct answers.
              
              Respond in JSON format:
              {
                "score": number,
                "feedback": "string"
              }
            `;

            const completion = await openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful teacher grading student exam answers. Be fair and encouraging in your feedback.'
                },
                {
                  role: 'user',
                  content: gradingPrompt
                }
              ],
              temperature: 0.3,
              response_format: { type: 'json_object' }
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            score = Math.min(result.score || 0, question.marks);
            aiScore = score;
            aiFeedback = result.feedback || 'Answer evaluated.';
          } catch (error) {
            console.error('AI grading error:', error);
            // Fallback: give partial credit and mark for manual review
            score = 0;
            aiFeedback = 'Pending manual review';
          }
        } else {
          // For other types or when AI is not available
          score = 0;
          aiFeedback = 'Answer recorded. Pending manual grading.';
        }
        
        totalScore += score;
        
        // Save answer with AI grading
        const answerRecord = await prisma.answer.create({
          data: {
            attemptId: finalAttemptId,
            questionId: question.id,
            answer: studentAnswer.answer,
            aiScore,
            aiFeedback,
            finalScore: score
          }
        });
        answerRecords.push(answerRecord);
      } else {
        // No answer provided
        const answerRecord = await prisma.answer.create({
          data: {
            attemptId: finalAttemptId,
            questionId: question.id,
            answer: '',
            aiScore: 0,
            aiFeedback: 'No answer provided',
            finalScore: 0
          }
        });
        answerRecords.push(answerRecord);
      }
    }

    // Update attempt as completed
    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: finalAttemptId },
      data: {
        isCompleted: true,
        submittedAt: new Date(),
        timeSpent: Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 60000) // in minutes
      }
    });

    // Calculate grade letter
    const percentage = (totalScore / maxScore) * 100;
    let gradeLetter = 'F';
    if (percentage >= 90) gradeLetter = 'A';
    else if (percentage >= 80) gradeLetter = 'B';
    else if (percentage >= 70) gradeLetter = 'C';
    else if (percentage >= 60) gradeLetter = 'D';

    // Generate overall AI analysis if AI is available
    let aiAnalysis = null;
    if (openai) {
      try {
        const analysisPrompt = `
          Analyze the exam performance:
          Score: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%)
          Subject: ${attempt.exam.subject}
          Grade Level: ${attempt.exam.gradeLevel}
          
          Provide a brief analysis including:
          1. Overall performance assessment
          2. Key strengths (if any)
          3. Areas for improvement
          4. Encouragement or next steps
          
          Keep it concise and constructive (3-4 sentences).
        `;

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an encouraging teacher providing constructive feedback.'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 200
        });

        aiAnalysis = {
          feedback: completion.choices[0].message.content,
          generatedAt: new Date()
        };
      } catch (error) {
        console.error('AI analysis error:', error);
      }
    }

    // Create grade record with AI grading
    const grade = await prisma.grade.create({
      data: {
        attemptId: finalAttemptId,
        studentId: session.user.id,
        totalScore,
        percentage,
        grade: gradeLetter,
        status: openai ? 'COMPLETED' : 'PENDING',
        aiAnalysis,
        overallFeedback: aiAnalysis?.feedback || null
      }
    });

    return NextResponse.json({
      attemptId: finalAttemptId,
      message: 'Exam submitted successfully',
      preliminaryScore: {
        score: totalScore,
        maxScore,
        percentage: grade.percentage
      }
    });
  } catch (error) {
    console.error('Error submitting exam:', error);
    return NextResponse.json(
      { error: 'Failed to submit exam' },
      { status: 500 }
    );
  }
}