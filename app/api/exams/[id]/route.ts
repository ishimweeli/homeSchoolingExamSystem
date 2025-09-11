import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET exam by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
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

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    return NextResponse.json(exam)

  } catch (error) {
    console.error('Error fetching exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// UPDATE exam
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const examId = params.id
    const body = await request.json()

    // Check if exam exists and user owns it
    const existingExam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true }
    })

    if (!existingExam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    if (existingExam.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this exam' }, { status: 403 })
    }

    const { title, description, subject, gradeLevel, duration, totalMarks, passingMarks, questions } = body

    // Update exam details first
    const updatedExam = await prisma.exam.update({
      where: { id: examId },
      data: {
        title,
        description,
        subject,
        gradeLevel,
        duration,
        totalMarks,
        passingMarks,
      }
    })

    // Update questions if provided
    if (questions && Array.isArray(questions)) {
      // Delete existing questions first
      await prisma.question.deleteMany({
        where: { examId }
      })

      // Create new questions one by one (no transactions)
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        try {
          await prisma.question.create({
            data: {
              examId,
              type: question.type,
              question: question.question,
              options: question.options,
              correctAnswer: question.correctAnswer,
              marks: question.marks || 5,
              difficulty: question.difficulty,
              topic: question.topic,
              order: i,
            }
          })
        } catch (error) {
          console.error(`Failed to create question ${i + 1}:`, error)
          // Continue with other questions instead of failing completely
        }
      }
    }

    // Fetch updated exam with questions
    const examWithQuestions = await prisma.exam.findUnique({
      where: { id: examId },
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
      message: 'Exam updated successfully',
      exam: examWithQuestions
    })

  } catch (error) {
    console.error('Error updating exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE exam
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const examId = params.id

    // Check if exam exists and user owns it
    const exam = await prisma.exam.findUnique({
      where: { id: examId }
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    if (exam.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this exam' }, { status: 403 })
    }

    // Delete exam (questions will be deleted due to cascade)
    await prisma.exam.delete({
      where: { id: examId }
    })

    return NextResponse.json({ message: 'Exam deleted successfully' })

  } catch (error) {
    console.error('Error deleting exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}