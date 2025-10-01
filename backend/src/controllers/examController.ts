import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import OpenAI from 'openai';
import { incrementTierUsage } from '../middleware/tierLimits';

let openai: OpenAI | null = null;

const getOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

// Validation schemas
const createExamSchema = z.object({
  title: z.string().min(3),
  subject: z.string(),
  gradeLevel: z.number().min(1).max(12),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  duration: z.number().min(5),
  questions: z.array(z.object({
    type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER', 'FILL_BLANKS']),
    question: z.string(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string(),
    marks: z.number(),
    explanation: z.string().optional(),
  })),
});

const generateExamSchema = z.object({
  subject: z.string(),
  gradeLevel: z.number(),
  topics: z.array(z.string()),
  questionCount: z.number().min(1).max(50),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  questionTypes: z.array(z.string()).optional(),
});

// Create exam manually
export const createExam = async (req: Request, res: Response) => {
  try {
    const validatedData = createExamSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Calculate total marks
    const totalMarks = validatedData.questions.reduce((sum, q) => sum + q.marks, 0);

    const exam = await prisma.exam.create({
      data: {
        title: validatedData.title,
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        duration: validatedData.duration,
        totalMarks,
        passingMarks: Math.round(totalMarks * 0.4), // 40% passing
        creatorId: (req as any).user.id,
        aiGenerated: false,
        questions: {
          create: validatedData.questions.map((q, index) => ({
            type: q.type,
            question: q.question,
            correctAnswer: JSON.stringify(q.correctAnswer),
            marks: q.marks,
            order: index + 1,
            options: q.options ? JSON.stringify(q.options) : undefined,
            difficulty: validatedData.difficulty?.toLowerCase() || 'medium',
          })),
        },
      },
      include: {
        questions: true,
        _count: {
          select: { questions: true },
        },
      },
    });

    // Increment tier usage after successful exam creation
    await incrementTierUsage((req as any).user.id, 'CREATE_EXAM');

    res.status(201).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof z.ZodError ? 'Validation error' : 'Failed to create exam',
      errors: error instanceof z.ZodError ? error.errors : undefined,
    });
  }
};

// Generate exam using AI
export const generateExamWithAI = async (req: Request, res: Response) => {
  try {
    const validatedData = generateExamSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const openaiClient = getOpenAI();
    if (!openaiClient) {
      return res.status(503).json({ success: false, message: 'AI generation is not available. OpenAI API key is missing.' });
    }

    // Build prompt for AI
    const prompt = `Create an exam with the following specifications:
    - Subject: ${validatedData.subject}
    - Grade Level: ${validatedData.gradeLevel}
    - Topics: ${validatedData.topics.join(', ')}
    - Number of Questions: ${validatedData.questionCount}
    - Difficulty: ${validatedData.difficulty}
    - Question Types: ${validatedData.questionTypes?.join(', ') || 'Mix of all types'}

    Generate ${validatedData.questionCount} questions appropriate for grade ${validatedData.gradeLevel}.
    Include variety in question types. For each question provide:
    1. The question text
    2. Options (for multiple choice)
    3. Correct answer
    4. Brief explanation
    5. Marks (based on difficulty: Easy=2, Medium=5, Hard=10)

    Return as JSON array with this structure:
    [{
      "type": "MULTIPLE_CHOICE",
      "question": "...",
      "options": ["..."],
      "correctAnswer": "...",
      "explanation": "...",
      "marks": 5
    }]`;

    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educator creating age-appropriate exams. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponse = completion.choices[0].message.content;
    const questions = JSON.parse(aiResponse || '[]');

    // Calculate total marks
    const totalMarks = questions.reduce((sum: number, q: any) => sum + q.marks, 0);

    // Create exam with AI-generated questions
    const exam = await prisma.exam.create({
      data: {
        title: `${validatedData.subject} Assessment - ${validatedData.topics.join(', ')}`,
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        duration: validatedData.questionCount * 3, // 3 minutes per question
        totalMarks,
        passingMarks: Math.round(totalMarks * 0.4),
        creatorId: (req as any).user.id,
        aiGenerated: true,
        questions: {
          create: questions.map((q: any, index: number) => ({
            type: q.type,
            question: q.question,
            options: q.options ? JSON.stringify(q.options) : undefined,
            correctAnswer: JSON.stringify(q.correctAnswer),
            explanation: q.explanation,
            marks: q.marks,
            order: index + 1,
            difficulty: validatedData.difficulty.toLowerCase(),
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    res.status(201).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    console.error('Generate exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate exam',
    });
  }
};

// Get all exams for user
export const getExams = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { page = 1, limit = 10, subject, gradeLevel } = req.query;

    const where: any = {};

    // Filter by role
    if ((req as any).user.role === 'STUDENT') {
      // Students see assigned exams
      where.assignments = {
        some: {
          studentId: (req as any).user.id,
        },
      };
    } else {
      // Teachers/Parents see their created exams
      where.creatorId = (req as any).user.id;
    }

    if (subject) where.subject = subject;
    if (gradeLevel) where.gradeLevel = Number(gradeLevel);

    const exams = await prisma.exam.findMany({
      where,
      include: {
        _count: {
          select: {
            questions: true,
            assignments: true,
            attempts: true,
          },
        },
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await prisma.exam.count({ where });

    res.json({
      success: true,
      data: exams,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exams',
    });
  }
};

// Get single exam
export const getExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            attempts: true,
            assignments: true,
          },
        },
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Parse JSON options for questions
    const examWithParsedOptions = {
      ...exam,
      questions: exam.questions.map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options as string) : null,
      })),
    };

    res.json({
      success: true,
      data: examWithParsedOptions,
    });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam',
    });
  }
};

// Assign exam to students
export const assignExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentIds, dueDate, maxAttempts = 1 } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if user owns the exam
    const exam = await prisma.exam.findUnique({
      where: { id },
    });

    if (!exam || exam.creatorId !== (req as any).user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign your own exams',
      });
    }

    // Ensure ownership: students must belong to the assigner (parent->parentId, teacher->createdById)
    const ownershipWhere = (req as any).user.role === 'TEACHER'
      ? { createdById: (req as any).user.id }
      : { parentId: (req as any).user.id };

    const ownedStudents = await prisma.user.findMany({
      where: { id: { in: studentIds }, role: 'STUDENT', ...ownershipWhere },
      select: { id: true },
    });

    if (ownedStudents.length !== studentIds.length) {
      return res.status(403).json({ success: false, message: 'One or more students are not yours to assign' });
    }

    // Check for existing assignments to prevent duplicates
    const existingAssignments = await prisma.examAssignment.findMany({
      where: {
        examId: id,
        studentId: { in: studentIds }
      },
      select: {
        studentId: true,
        student: {
          select: {
            name: true,
            username: true
          }
        }
      }
    });

    if (existingAssignments.length > 0) {
      const duplicateStudents = existingAssignments.map(a =>
        a.student?.name || a.student?.username || a.studentId
      ).join(', ');

      return res.status(400).json({
        success: false,
        message: `Exam already assigned to: ${duplicateStudents}. Cannot assign the same exam twice to a student.`,
        duplicates: existingAssignments
      });
    }

    const assignments = await prisma.examAssignment.createMany({
      data: studentIds.map((studentId: string) => ({
        examId: id,
        studentId,
        assignedBy: (req as any).user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        maxAttempts,
      })),
    });

    res.json({
      success: true,
      message: `Exam assigned to ${assignments.count} students`,
      data: assignments,
    });
  } catch (error) {
    console.error('Assign exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign exam',
    });
  }
};

// Start exam attempt
export const startExamAttempt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if student has assignment
    const assignment = await prisma.examAssignment.findFirst({
      where: {
        examId: id,
        studentId: (req as any).user.id,
      },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this exam',
      });
    }

    // Check if max attempts reached
    const attemptCount = await prisma.examAttempt.count({
      where: {
        examId: id,
        studentId: (req as any).user.id,
        isCompleted: true,
      },
    });

    if (attemptCount >= assignment.maxAttempts) {
      return res.status(403).json({
        success: false,
        message: 'Maximum attempts reached',
      });
    }

    // Create new attempt
    const attempt = await prisma.examAttempt.create({
      data: {
        examId: id,
        studentId: (req as any).user.id,
        isCompleted: false,
      },
    });

    // Return exam with questions (hide correct answers)
    const examData = {
      ...assignment.exam,
      questions: assignment.exam.questions.map(q => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options ? JSON.parse(q.options as string) : null,
        marks: q.marks,
        order: q.order,
      })),
      attemptId: attempt.id,
    };

    res.json({
      success: true,
      data: examData,
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start exam',
    });
  }
};

// Submit exam
export const submitExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { attemptId, answers } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get attempt with exam questions
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!attempt || attempt.studentId !== (req as any).user.id) {
      return res.status(403).json({
        success: false,
        message: 'Invalid attempt',
      });
    }

    // Calculate score
    let totalScore = 0;
    const answerData = [];

    // Handle both answer formats (array or object)
    const answerMap = Array.isArray(answers)
      ? answers.reduce((acc, ans) => ({ ...acc, [ans.questionId]: ans.answer }), {})
      : answers;

    for (const question of attempt.exam.questions) {
      const studentAnswer = answerMap[question.id] || '';
      let correctAnswer = question.correctAnswer;

      // Parse correctAnswer if it's stored as JSON string
      if (typeof correctAnswer === 'string' && (correctAnswer.startsWith('"') || correctAnswer.startsWith('['))) {
        try {
          correctAnswer = JSON.parse(correctAnswer);
        } catch (e) {
          // Keep as string if parse fails
        }
      }

      const isCorrect = String(studentAnswer).toLowerCase() === String(correctAnswer).toLowerCase();
      const marksAwarded = isCorrect ? question.marks : 0;
      totalScore += marksAwarded;

      answerData.push({
        attemptId,
        questionId: question.id,
        answer: studentAnswer || '',
        finalScore: marksAwarded,
      });
    }

    // Save answers and update attempt
    await prisma.answer.createMany({
      data: answerData,
    });

    const percentage = (totalScore / attempt.exam.totalMarks) * 100;
    const grade = percentage >= 90 ? 'A+' :
                 percentage >= 80 ? 'A' :
                 percentage >= 70 ? 'B' :
                 percentage >= 60 ? 'C' :
                 percentage >= 50 ? 'D' : 'F';

    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        isCompleted: true,
        submittedAt: new Date(),
        timeSpent: Math.round((Date.now() - attempt.startedAt.getTime()) / 60000), // convert to minutes
      },
    });

    await prisma.grade.create({
      data: {
        attemptId,
        studentId: (req as any).user.id,
        totalScore,
        percentage,
        grade,
        isPublished: true,
        status: 'COMPLETED',
      },
    });

    res.json({
      success: true,
      data: {
        totalMarks: attempt.exam.totalMarks,
        obtainedMarks: totalScore,
        percentage: percentage.toFixed(2),
        grade,
        passed: totalScore >= attempt.exam.passingMarks,
      },
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit exam',
    });
  }
};

// Get exam results
export const getExamResults = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;

    const result = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: true,
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
        grade: true,
        student: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found',
      });
    }

    // Format result with question details
    const formattedResult = {
      ...result,
      answers: result.answers.map(answer => ({
        ...answer,
        question: {
          ...answer.question,
          options: answer.question.options ? JSON.parse(answer.question.options as string) : null,
        },
      })),
    };

    res.json({
      success: true,
      data: formattedResult,
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results',
    });
  }
};