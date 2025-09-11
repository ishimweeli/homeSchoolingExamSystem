import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET all exams for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exams = await prisma.exam.findMany({
      where: {
        creatorId: session.user.id
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
        questions: {
          select: {
            id: true,
            marks: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(exams)

  } catch (error) {
    console.error('Error fetching exams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// CREATE new exam
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      subject, 
      gradeLevel, 
      duration, 
      totalMarks, 
      passingMarks,
      questions,
      aiGenerated = false,
      aiConfig
    } = body

    // Validation
    if (!title || !subject) {
      return NextResponse.json({ error: 'Title and subject are required' }, { status: 400 })
    }

    // Create exam using transaction
    const exam = await prisma.$transaction(async (tx) => {
      // Create exam
      const newExam = await tx.exam.create({
        data: {
          title,
          description,
          subject,
          gradeLevel: gradeLevel || 1,
          duration: duration || 60,
          totalMarks: totalMarks || 100,
          passingMarks: passingMarks || 50,
          aiGenerated,
          aiConfig,
          creatorId: session.user.id,
          status: 'DRAFT',
        }
      })

      // Create questions if provided
      if (questions && Array.isArray(questions)) {
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i]
          await tx.question.create({
            data: {
              examId: newExam.id,
              type: question.type || 'MULTIPLE_CHOICE',
              question: question.question,
              options: question.options,
              correctAnswer: question.correctAnswer,
              marks: question.marks || 5,
              difficulty: question.difficulty,
              topic: question.topic,
              aiGenerated: question.aiGenerated || false,
              gradingRubric: question.gradingRubric,
              sampleAnswer: question.sampleAnswer,
              order: i,
            }
          })
        }
      }

      return newExam
    })

    // Fetch the complete exam with questions
    const completeExam = await prisma.exam.findUnique({
      where: { id: exam.id },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    return NextResponse.json({ 
      message: 'Exam created successfully',
      exam: completeExam
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}