import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { aiService } from '@/lib/ai-service'
import { z } from 'zod'

const adaptiveExamSchema = z.object({
  title: z.string().min(3),
  subject: z.string(),
  gradeLevel: z.number().min(1).max(12),
  studentId: z.string(),
  numberOfQuestions: z.number().min(5).max(50).default(20),
  targetDifficulty: z.enum(['auto', 'easy', 'medium', 'hard']).default('auto'),
  focusAreas: z.array(z.string()).optional(),
  duration: z.number().min(10).max(120).default(60),
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
    const validatedData = adaptiveExamSchema.parse(body)

    // Get student performance data
    const performanceData = await prisma.studentPerformanceData.findUnique({
      where: {
        studentId_subject: {
          studentId: validatedData.studentId,
          subject: validatedData.subject
        }
      }
    })

    // Get student's recent exam history
    const recentAttempts = await prisma.examAttempt.findMany({
      where: {
        studentId: validatedData.studentId,
        exam: {
          subject: validatedData.subject,
          gradeLevel: validatedData.gradeLevel
        },
        isCompleted: true
      },
      include: {
        exam: true,
        grade: true,
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      },
      take: 5
    })

    // Analyze student performance and determine optimal difficulty/topics
    const analysis = analyzeStudentPerformance(performanceData, recentAttempts)
    
    // Determine adaptive difficulty
    let adaptiveDifficulty = validatedData.targetDifficulty
    if (adaptiveDifficulty === 'auto') {
      adaptiveDifficulty = analysis.recommendedDifficulty
    }

    // Generate adaptive exam prompt
    const adaptivePrompt = createAdaptiveExamPrompt({
      subject: validatedData.subject,
      gradeLevel: validatedData.gradeLevel,
      difficulty: adaptiveDifficulty,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendedTopics: analysis.recommendedTopics,
      skillLevel: analysis.skillLevel,
      focusAreas: validatedData.focusAreas || analysis.recommendedTopics,
      numberOfQuestions: validatedData.numberOfQuestions
    })

    // Generate questions using AI with adaptive parameters
    const generatedQuestions = await aiService.generateAdaptiveExam(adaptivePrompt)

    // Calculate total marks
    const totalMarks = generatedQuestions.reduce(
      (sum, question) => sum + question.marks,
      0
    )

    // Create exam in database
    const exam = await prisma.exam.create({
      data: {
        title: `${validatedData.title} (Adaptive)`,
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        duration: validatedData.duration,
        totalMarks,
        aiGenerated: true,
        aiConfig: {
          adaptive: true,
          studentId: validatedData.studentId,
          basedOnPerformance: analysis,
          targetDifficulty: adaptiveDifficulty,
          focusAreas: validatedData.focusAreas || analysis.recommendedTopics,
        },
        creatorId: session.user.id,
        questions: {
          create: generatedQuestions.map((question, index) => ({
            type: question.type,
            question: question.question,
            options: question.options || null,
            correctAnswer: question.correctAnswer,
            marks: question.marks,
            aiGenerated: true,
            difficulty: question.difficulty,
            topic: question.topic,
            gradingRubric: question.gradingRubric || null,
            sampleAnswer: question.sampleAnswer || null,
            order: index,
          })),
        },
      },
      include: {
        questions: true,
      },
    })

    // Update/create performance data if it doesn't exist
    await prisma.studentPerformanceData.upsert({
      where: {
        studentId_subject: {
          studentId: validatedData.studentId,
          subject: validatedData.subject
        }
      },
      create: {
        studentId: validatedData.studentId,
        subject: validatedData.subject,
        skillLevel: analysis.skillLevel,
        difficultyPreference: getDifficultyNumber(adaptiveDifficulty),
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        preferredQuestionTypes: analysis.preferredQuestionTypes
      },
      update: {
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        preferredQuestionTypes: analysis.preferredQuestionTypes,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'Adaptive exam generated successfully',
      id: exam.id,
      exam,
      adaptiveAnalysis: analysis
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data provided', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Adaptive exam generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate adaptive exam. Please try again.' },
      { status: 500 }
    )
  }
}

function analyzeStudentPerformance(performanceData: any, recentAttempts: any[]) {
  const analysis = {
    skillLevel: 5, // Default middle level
    recommendedDifficulty: 'medium' as const,
    strengths: [] as string[],
    weaknesses: [] as string[],
    recommendedTopics: [] as string[],
    preferredQuestionTypes: [] as string[],
    averageScore: 0,
    consistency: 0,
    trending: 'STABLE' as const
  }

  // Use existing performance data if available
  if (performanceData) {
    analysis.skillLevel = performanceData.skillLevel
    analysis.strengths = performanceData.strengths
    analysis.weaknesses = performanceData.weaknesses
    analysis.preferredQuestionTypes = performanceData.preferredQuestionTypes
    analysis.trending = performanceData.trending
  }

  // Analyze recent attempts
  if (recentAttempts.length > 0) {
    const scores = recentAttempts.map(attempt => attempt.grade?.percentage || 0)
    analysis.averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length

    // Determine skill level based on average performance
    if (analysis.averageScore >= 90) analysis.skillLevel = Math.max(7, analysis.skillLevel)
    else if (analysis.averageScore >= 80) analysis.skillLevel = Math.max(6, analysis.skillLevel)
    else if (analysis.averageScore >= 70) analysis.skillLevel = Math.max(5, analysis.skillLevel)
    else if (analysis.averageScore >= 60) analysis.skillLevel = Math.max(4, analysis.skillLevel)
    else analysis.skillLevel = Math.min(3, analysis.skillLevel)

    // Analyze question performance patterns
    const questionAnalysis = new Map<string, { correct: number, total: number }>()
    const topicAnalysis = new Map<string, { correct: number, total: number }>()

    recentAttempts.forEach(attempt => {
      attempt.answers.forEach((answer: any) => {
        const questionType = answer.question.type
        const topic = answer.question.topic || 'general'
        const isCorrect = (answer.finalScore || 0) >= (answer.question.marks * 0.7)

        // Track question type performance
        if (!questionAnalysis.has(questionType)) {
          questionAnalysis.set(questionType, { correct: 0, total: 0 })
        }
        const qData = questionAnalysis.get(questionType)!
        qData.total++
        if (isCorrect) qData.correct++

        // Track topic performance
        if (!topicAnalysis.has(topic)) {
          topicAnalysis.set(topic, { correct: 0, total: 0 })
        }
        const tData = topicAnalysis.get(topic)!
        tData.total++
        if (isCorrect) tData.correct++
      })
    })

    // Identify strengths and weaknesses
    analysis.strengths = []
    analysis.weaknesses = []
    analysis.preferredQuestionTypes = []

    for (const [type, data] of questionAnalysis) {
      const accuracy = data.correct / data.total
      if (accuracy >= 0.8 && data.total >= 3) {
        analysis.preferredQuestionTypes.push(type)
      }
    }

    for (const [topic, data] of topicAnalysis) {
      const accuracy = data.correct / data.total
      if (accuracy >= 0.8 && data.total >= 2) {
        analysis.strengths.push(topic)
      } else if (accuracy < 0.6 && data.total >= 2) {
        analysis.weaknesses.push(topic)
        analysis.recommendedTopics.push(topic) // Focus on weak areas
      }
    }

    // Determine recommended difficulty
    if (analysis.averageScore >= 85) {
      analysis.recommendedDifficulty = 'hard'
    } else if (analysis.averageScore >= 70) {
      analysis.recommendedDifficulty = 'medium'
    } else {
      analysis.recommendedDifficulty = 'easy'
    }

    // Calculate trending
    if (scores.length >= 3) {
      const recent = scores.slice(0, 2).reduce((a, b) => a + b) / 2
      const older = scores.slice(-2).reduce((a, b) => a + b) / 2
      if (recent > older + 10) analysis.trending = 'IMPROVING'
      else if (recent < older - 10) analysis.trending = 'DECLINING'
    }
  }

  return analysis
}

function createAdaptiveExamPrompt(params: {
  subject: string
  gradeLevel: number
  difficulty: string
  strengths: string[]
  weaknesses: string[]
  recommendedTopics: string[]
  skillLevel: number
  focusAreas: string[]
  numberOfQuestions: number
}) {
  return {
    subject: params.subject,
    gradeLevel: params.gradeLevel,
    numberOfQuestions: params.numberOfQuestions,
    difficulty: params.difficulty,
    adaptiveParams: {
      skillLevel: params.skillLevel,
      strengths: params.strengths,
      weaknesses: params.weaknesses,
      focusAreas: params.focusAreas,
      recommendedTopics: params.recommendedTopics
    },
    instructions: `Generate an adaptive exam that:
      1. Focuses on weak areas: ${params.weaknesses.join(', ') || 'balanced coverage'}
      2. Reinforces strengths: ${params.strengths.join(', ') || 'general skills'}
      3. Targets skill level: ${params.skillLevel}/10
      4. Emphasizes topics: ${params.focusAreas.join(', ')}
      5. Provides appropriate challenge for ${params.difficulty} difficulty`
  }
}

function getDifficultyNumber(difficulty: string): number {
  switch (difficulty) {
    case 'easy': return 3
    case 'medium': return 5
    case 'hard': return 8
    default: return 5
  }
}