import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { aiService } from '@/lib/ai-service'
import { z } from 'zod'

const generateExamSchema = z.object({
  title: z.string().min(3),
  subject: z.string(),
  gradeLevel: z.number().min(1).max(12),
  topics: z.array(z.string()).min(1),
  duration: z.number().min(10).max(180),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  numberOfQuestions: z.number().min(1).max(100),
  questionTypes: z.object({
    multipleChoice: z.number().min(0).default(0),
    trueFalse: z.number().min(0).default(0),
    shortAnswer: z.number().min(0).default(0),
    longAnswer: z.number().min(0).default(0),
    fillBlanks: z.number().min(0).default(0),
    mathProblem: z.number().min(0).default(0),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to create exams
    const userRole = session.user.role
    if (!['PARENT', 'TEACHER', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'You do not have permission to create exams' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = generateExamSchema.parse(body)

    // Generate questions using AI
    const generatedQuestions = await aiService.generateExam({
      subject: validatedData.subject,
      gradeLevel: validatedData.gradeLevel,
      topics: validatedData.topics,
      numberOfQuestions: validatedData.numberOfQuestions,
      questionTypes: validatedData.questionTypes,
      difficulty: validatedData.difficulty,
    })

    // Calculate total marks
    const totalMarks = generatedQuestions.reduce(
      (sum, question) => sum + question.marks,
      0
    )

    // Create exam in database
    const exam = await prisma.exam.create({
      data: {
        title: validatedData.title,
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        duration: validatedData.duration,
        totalMarks,
        aiGenerated: true,
        aiConfig: {
          topics: validatedData.topics,
          difficulty: validatedData.difficulty,
          questionTypes: validatedData.questionTypes,
        },
        creatorId: session.user.id,
        questions: {
          create: generatedQuestions.map((question, index) => ({
            type: question.type,
            question: question.question,
            options: question.options as any,
            correctAnswer: question.correctAnswer,
            marks: question.marks,
            aiGenerated: true,
            difficulty: question.difficulty,
            topic: question.topic,
            gradingRubric: question.gradingRubric as any,
            sampleAnswer: question.sampleAnswer || null,
            order: index,
          })),
        },
      },
      include: {
        questions: true,
        _count: {
          select: { attempts: true },
        },
      },
    })

    return NextResponse.json({
      message: 'Exam generated successfully',
      id: exam.id,
      exam,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data provided', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Exam generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate exam. Please try again.' },
      { status: 500 }
    )
  }
}