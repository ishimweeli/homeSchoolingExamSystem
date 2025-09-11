import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
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
      where: { id: examId },
      include: { questions: true }
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    if (exam.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to publish this exam' }, { status: 403 })
    }

    if (exam.questions.length === 0) {
      return NextResponse.json({ error: 'Cannot publish exam without questions' }, { status: 400 })
    }

    // Update exam status to published
    const publishedExam = await prisma.exam.update({
      where: { id: examId },
      data: { 
        status: 'ACTIVE',
        scheduledFor: new Date()
      }
    })

    return NextResponse.json({ 
      message: 'Exam published successfully',
      exam: publishedExam
    })

  } catch (error) {
    console.error('Error publishing exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}