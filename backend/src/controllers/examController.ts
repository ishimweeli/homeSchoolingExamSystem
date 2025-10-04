import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { incrementTierUsage } from '../middleware/tierLimits';
import { getAIClient, getAIModel, isAIAvailable, generateExamQuestions } from '../utils/aiClient';

// Validation schemas
const createExamSchema = z.object({
  title: z.string().min(3),
  subject: z.string(),
  gradeLevel: z.number().min(1).max(12),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  duration: z.number().min(5),
  questions: z.array(z.object({
    type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER', 'FILL_BLANKS', 'MATCHING', 'ORDERING', 'MATH_PROBLEM', 'CODING', 'DIAGRAM']),
    question: z.string(),
    // Allow: string[], array of object (e.g., MATCHING), record, raw string, or null
    options: z.union([
      z.array(z.string()),
      z.array(z.record(z.any())),
      z.record(z.string()),
      z.string(),
      z.null()
    ]).optional(),
    correctAnswer: z.union([z.string(), z.array(z.string()), z.record(z.string())]),
    marks: z.number(),
    explanation: z.string().nullable().optional(),
    sampleAnswer: z.string().nullable().optional(),
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
            correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer),
            marks: q.marks,
            order: index + 1,
            options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : undefined,
            sampleAnswer: q.sampleAnswer || q.explanation || undefined,
            explanation: q.explanation || undefined,
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

    if (!isAIAvailable()) {
      return res.status(503).json({ success: false, message: 'AI generation is not available. API key is missing.' });
    }

    // Delegate question generation to centralized AI service
    const questions = await generateExamQuestions({
      subject: validatedData.subject,
      gradeLevel: validatedData.gradeLevel,
      topics: validatedData.topics,
      questionCount: validatedData.questionCount,
      difficulty: validatedData.difficulty as any,
      questionTypes: validatedData.questionTypes,
    });

    // No server-side normalization or remapping; AI must follow the schema strictly
    const validatedQuestions = questions;

    // Calculate total marks (no server-side defaults)
    const totalMarks = validatedQuestions.reduce((sum: number, q: any) => sum + (typeof q.marks === 'number' ? q.marks : 0), 0);

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
          create: validatedQuestions.map((q: any, index: number) => ({
            type: q.type,
            question: q.question,
            options: q.options ? JSON.stringify(q.options) : undefined,
            correctAnswer: JSON.stringify(q.correctAnswer),
            // Temporarily store explanation in sampleAnswer until migration runs
            sampleAnswer: q.explanation || null,
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
    
    // Better error handling for validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Please check your input data',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: (err as any).received
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate exam',
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

    // Parse JSON fields for questions
    const examWithParsedData = {
      ...exam,
      questions: exam.questions.map(q => {
        try {
          return {
            ...q,
            options: q.options ? JSON.parse(q.options as string) : null,
            correctAnswer: q.correctAnswer ? JSON.parse(q.correctAnswer as string) : null,
          };
        } catch (parseError) {
          console.error('Error parsing question data:', q.id, parseError);
          return {
            ...q,
            options: q.options,
            correctAnswer: q.correctAnswer,
          };
        }
      }),
    };

    res.json({
      success: true,
      data: examWithParsedData,
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
// Get exam assignments
export const getExamAssignments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const assignments = await prisma.examAssignment.findMany({
      where: { examId: id },
      select: {
        id: true,
        studentId: true,
        student: {
          select: {
            name: true,
            username: true,
          },
        },
        createdAt: true,
        dueDate: true,
      },
    });

    res.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
    });
  }
};

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

    // Check for existing incomplete attempt
    let attempt = await prisma.examAttempt.findFirst({
      where: {
        examId: id,
        studentId: (req as any).user.id,
        isCompleted: false,
      },
    });

    // If no incomplete attempt, check if max attempts reached
    if (!attempt) {
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
          message: `Maximum attempts reached (${assignment.maxAttempts} allowed)`,
        });
      }

      // Create new attempt
      attempt = await prisma.examAttempt.create({
        data: {
          examId: id,
          studentId: (req as any).user.id,
          isCompleted: false,
        },
      });
    }

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

// Publish exam
export const publishExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

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
        message: 'You can only publish your own exams',
      });
    }

    // Update exam status to ACTIVE
    const updatedExam = await prisma.exam.update({
      where: { id },
      data: {
        status: 'ACTIVE',
      },
    });

    res.json({
      success: true,
      data: updatedExam,
      message: 'Exam published successfully',
    });
  } catch (error) {
    console.error('Publish exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish exam',
    });
  }
};

// Delete exam
export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if user owns the exam
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: true,
            attempts: true,
          },
        },
      },
    });

    if (!exam || exam.creatorId !== (req as any).user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own exams',
      });
    }

    // Check if exam has assignments or attempts
    if (exam._count.assignments > 0 || exam._count.attempts > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete exam. It has ${exam._count.assignments} assignment(s) and ${exam._count.attempts} attempt(s). All related data will be deleted permanently.`,
        data: {
          assignments: exam._count.assignments,
          attempts: exam._count.attempts,
        },
      });
    }

    // Delete exam (cascade will delete questions)
    await prisma.exam.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam',
    });
  }
};

// Update exam
export const updateExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = createExamSchema.parse(req.body);

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
        message: 'You can only edit your own exams',
      });
    }

    // Calculate total marks
    const totalMarks = validatedData.questions.reduce((sum, q) => sum + q.marks, 0);

    // Delete existing questions and create new ones
    await prisma.question.deleteMany({
      where: { examId: id },
    });

    const updatedExam = await prisma.exam.update({
      where: { id },
      data: {
        title: validatedData.title,
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        duration: validatedData.duration,
        totalMarks,
        passingMarks: Math.round(totalMarks * 0.4),
        questions: {
          create: validatedData.questions.map((q, index) => ({
            type: q.type,
            question: q.question,
            correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer),
            marks: q.marks,
            order: index + 1,
            options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : undefined,
            sampleAnswer: q.sampleAnswer || q.explanation || undefined,
            explanation: q.explanation || undefined,
            difficulty: validatedData.difficulty?.toLowerCase() || 'medium',
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    res.json({
      success: true,
      data: updatedExam,
      message: 'Exam updated successfully',
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof z.ZodError ? 'Validation error' : 'Failed to update exam',
      errors: error instanceof z.ZodError ? error.errors : undefined,
    });
  }
};