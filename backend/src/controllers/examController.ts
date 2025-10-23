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

    if (!req.user || !(req as any).orgId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Calculate total marks
    const totalMarks = validatedData.questions.reduce((sum, q) => sum + q.marks, 0);

    // Create the exam scoped to the organization
    const exam = await prisma.exam.create({
      data: {
        title: validatedData.title,
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        duration: validatedData.duration,
        totalMarks,
        passingMarks: Math.round(totalMarks * 0.4), // 40% passing
        aiGenerated: false,
        creatorId: (req as any).user.id,
        organizationId: (req as any).orgId, // organization isolation
        questions: {
          create: validatedData.questions.map((q, index) => ({
            type: q.type,
            question: q.question,
            correctAnswer:
              typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer),
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

    if (!req.user || !(req as any).orgId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!isAIAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'AI generation is not available. API key is missing.',
      });
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

    // AI-generated questions are expected to follow the schema strictly
    const validatedQuestions = questions;

    // Calculate total marks
    const totalMarks = validatedQuestions.reduce(
      (sum: number, q: any) => sum + (typeof q.marks === 'number' ? q.marks : 0),
      0
    );

    // Create exam scoped to the organization
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
        organizationId: (req as any).orgId, // organization isolation
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

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Please check your input data',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: (err as any).received,
        })),
      });
    }

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('user not found')
      ) {
        return res.status(503).json({
          success: false,
          message:
            '🔑 OpenRouter API key is invalid or has no credits. Please add credits at https://openrouter.ai/ or contact support.',
          details:
            'The AI service requires a valid API key with available credits to generate exams.',
        });
      }
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
    if (!req.user || !(req as any).orgId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { page = 1, limit = 10, subject, gradeLevel } = req.query;

    const where: any = {
      organizationId: (req as any).orgId, // Ensure org isolation
    };

    // Filter by role
    if ((req as any).user.role === 'STUDENT') {
      // Students see only assigned exams
      where.assignments = {
        some: {
          studentId: (req as any).user.id,
        },
      };
    } else if ((req as any).user.role !== 'ADMIN') {
      // Non-admin staff see only their created exams
      where.creatorId = (req as any).user.id;
    }
    // Admins see all exams in the organization, so we don't filter by creatorId


    if (subject) where.subject = String(subject);
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

    if (!req.user || !(req as any).orgId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const exam = await prisma.exam.findFirst({
      where: {
        id,
        organizationId: (req as any).orgId, // enforce org isolation
      },
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

    const where: any = { examId: id, organizationId: (req as any).orgId };

    // Optionally, students only see their own assignments
    if ((req as any).user.role === 'STUDENT') {
      where.studentId = (req as any).user.id;
    }

    const assignments = await prisma.examAssignment.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        student: {
          select: {
            name: true,
            username: true,
          },
        },
        assignedBy: true,
        createdAt: true,
        dueDate: true,
      },
      orderBy: {
        createdAt: 'desc',
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
    const { studentIds, dueDate, maxAttempts = 2 } = req.body;

    if (!req.user || !(req as any).orgId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if the exam exists and belongs to the same organization
    const exam = await prisma.exam.findFirst({
      where: {
        id,
        organizationId: (req as any).orgId,
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found in your organization',
      });
    }

    // Calculate total attempts needed
    const totalAttemptsNeeded = studentIds.length * maxAttempts;

    // Tier attempt check
    const { checkAttemptPool, deductAttempts } = require('../middleware/tierLimits');
    const attemptCheck = await checkAttemptPool((req as any).user.id, totalAttemptsNeeded);

    if (!attemptCheck.canAssign) {
      return res.status(403).json({
        success: false,
        message: attemptCheck.message || 'Insufficient attempts in your pool',
        attemptsNeeded: totalAttemptsNeeded,
        attemptsRemaining: attemptCheck.remaining,
      });
    }

    // Ownership check based on role
    let ownershipWhere: any = { organizationId: (req as any).orgId };

    if ((req as any).user.role === 'TEACHER') {
      ownershipWhere.createdById = (req as any).user.id;
    } else if ((req as any).user.role === 'PARENT') {
      ownershipWhere.parentId = (req as any).user.id;
    } else if ((req as any).user.role === 'ADMIN') {
      // Admins can assign to any student in the org → no additional filter
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, or parents can assign exams',
      });
    }

    // Ensure students belong to this user (or org for admins)
    const ownedStudents = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        role: 'STUDENT',
        ...ownershipWhere,
      },
      select: { id: true },
    });

    if (ownedStudents.length !== studentIds.length) {
      return res.status(403).json({
        success: false,
        message: 'One or more students are not allowed to be assigned by you',
      });
    }

    // Prevent duplicate assignments
    const existingAssignments = await prisma.examAssignment.findMany({
      where: {
        examId: id,
        studentId: { in: studentIds },
      },
      select: {
        studentId: true,
        student: { select: { name: true, username: true } },
      },
    });

    if (existingAssignments.length > 0) {
      const duplicateStudents = existingAssignments
        .map(a => a.student?.name || a.student?.username || a.studentId)
        .join(', ');

      return res.status(400).json({
        success: false,
        message: `Exam already assigned to: ${duplicateStudents}`,
        duplicates: existingAssignments,
      });
    }

    // Create assignments
    const assignments = await prisma.examAssignment.createMany({
      data: studentIds.map((studentId: string) => ({
        examId: id,
        studentId,
        assignedBy: (req as any).user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        maxAttempts,
      })),
    });

    // Deduct attempts from user pool
    await deductAttempts((req as any).user.id, totalAttemptsNeeded);

    res.json({
      success: true,
      message: `Exam assigned to ${assignments.count} students (${maxAttempts} attempts each)`,
      data: {
        count: assignments.count,
        maxAttempts,
        totalAttemptsUsed: totalAttemptsNeeded,
        attemptsRemaining: attemptCheck.remaining - totalAttemptsNeeded,
      },
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

    const userId = (req as any).user.id;
    const orgId = (req as any).orgId;

    // Find assignment for the student in the current org
    const assignment = await prisma.examAssignment.findFirst({
      where: {
        examId: id,
        studentId: userId,
        exam: {
          organizationId: orgId, // Filter through the relation
        },
      },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
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
        studentId: userId,
        isCompleted: false,
        submittedAt: null,
      },
    });

    // If no incomplete attempt, check max attempts
    if (!attempt) {
      if (assignment.attemptsUsed >= assignment.maxAttempts) {
        return res.status(403).json({
          success: false,
          message: `Maximum attempts reached (${assignment.maxAttempts} allowed, ${assignment.attemptsUsed} used)`,
        });
      }

      // Create new attempt
      attempt = await prisma.examAttempt.create({
        data: {
          examId: id,
          studentId: userId,
          isCompleted: false,
        },
      });
    }

    // Prepare exam data for student (hide correct answers)
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

    const userId = (req as any).user.id;
    const orgId = (req as any).orgId;

    // Get attempt with exam questions and organization scoping
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        studentId: userId,
        exam: {
          id: id,
          organizationId: orgId, // ensure tenant isolation
        },
      },
      include: {
        exam: {
          include: { questions: true },
        },
      },
    });

    if (!attempt) {
      return res.status(403).json({
        success: false,
        message: 'Invalid attempt or exam does not belong to your organization',
      });
    }

    // Calculate score
    let totalScore = 0;
    const answerData: Array<{ attemptId: string; questionId: string; answer: any; finalScore: number }> = [];

    // Normalize answers: array or object
    const answerMap: Record<string, any> = Array.isArray(answers)
      ? answers.reduce((acc, ans) => ({ ...acc, [ans.questionId]: ans.answer }), {})
      : answers;

    for (const question of attempt.exam.questions) {
      const studentAnswer = answerMap[question.id] ?? '';
      let correctAnswer = question.correctAnswer;

      // Parse correctAnswer if stored as JSON string
      if (typeof correctAnswer === 'string' && (correctAnswer.startsWith('"') || correctAnswer.startsWith('['))) {
        try { correctAnswer = JSON.parse(correctAnswer); } catch { /* fallback to string */ }
      }

      const isCorrect = String(studentAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
      const marksAwarded = isCorrect ? question.marks : 0;
      totalScore += marksAwarded;

      answerData.push({ attemptId, questionId: question.id, answer: studentAnswer, finalScore: marksAwarded });
    }

    // Save answers
    await prisma.answer.createMany({ data: answerData });

    const percentage = (totalScore / attempt.exam.totalMarks) * 100;
    const grade = percentage >= 90 ? 'A+' :
      percentage >= 80 ? 'A' :
        percentage >= 70 ? 'B' :
          percentage >= 60 ? 'C' :
            percentage >= 50 ? 'D' : 'F';

    // Update attempt as completed
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        isCompleted: true,
        submittedAt: new Date(),
        timeSpent: attempt.startedAt ? Math.round((Date.now() - attempt.startedAt.getTime()) / 60000) : null,
      },
    });

    // Increment attempts used in the assignment (tenant-safe)
    await prisma.examAssignment.updateMany({
      where: {
        examId: id,
        studentId: userId,
        exam: { organizationId: orgId }, // tenant check
      },
      data: { attemptsUsed: { increment: 1 } },
    });

    // Save grade
    await prisma.grade.create({
      data: {
        attemptId,
        studentId: userId,
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

// Unassign student from exam and refund attempts
export const unassignExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;  // exam ID
    const { studentId } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const orgId = (req as any).orgId;

    // Fetch exam with orgId for tenant isolation
    const exam = await prisma.exam.findUnique({
      where: { id },
    });

    if (!exam || exam.organizationId !== orgId) {
      return res.status(403).json({
        success: false,
        message: 'Exam not found or does not belong to your organization',
      });
    }

    // Only allow unassign if user is creator, admin, or parent
    if (![userId, 'ADMIN'].includes(userRole) && exam.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to unassign this exam',
      });
    }

    // Find the assignment
    const assignment = await prisma.examAssignment.findFirst({
      where: {
        examId: id,
        studentId,
        exam: { organizationId: orgId },
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Count attempts actually used
    const attempts = await prisma.examAttempt.findMany({
      where: {
        examId: id,
        studentId,
      },
      select: { id: true },
    });

    const attemptsUsed = attempts.length;
    const attemptsAllocated = assignment.maxAttempts;
    const attemptsToRefund = Math.max(0, attemptsAllocated - attemptsUsed);

    // Delete answers and grades
    for (const attempt of attempts) {
      await prisma.answer.deleteMany({ where: { attemptId: attempt.id } });
      await prisma.grade.deleteMany({ where: { attemptId: attempt.id } });
    }

    // Delete attempts
    await prisma.examAttempt.deleteMany({
      where: {
        examId: id,
        studentId,
      },
    });

    // Delete the assignment
    await prisma.examAssignment.delete({ where: { id: assignment.id } });

    // Refund unused attempts to the teacher/assigner
    const { refundAttempts } = require('../middleware/tierLimits');
    if (attemptsToRefund > 0) {
      await refundAttempts(assignment.assignedBy, attemptsToRefund);
    }

    res.json({
      success: true,
      message: attemptsToRefund > 0
        ? `Student unassigned. ${attemptsUsed} attempts used, ${attemptsToRefund} unused attempts refunded to assigner`
        : `Student unassigned. All ${attemptsUsed} attempts were used, none refunded`,
      data: {
        attemptsAllocated,
        attemptsUsed,
        attemptsRefunded: attemptsToRefund,
      },
    });
  } catch (error) {
    console.error('Unassign exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign exam',
    });
  }
};


// Get all attempts for a specific exam by the current user
export const getExamAttempts = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = (req as any).user.id;
    const orgId = (req as any).orgId;

    // Check if exam exists and belongs to the organization
    const examExists = await prisma.exam.findUnique({
      where: { id: examId },
      select: { organizationId: true },
    });

    if (!examExists || examExists.organizationId !== orgId) {
      return res.status(403).json({
        success: false,
        message: 'Exam not found or does not belong to your organization',
      });
    }

    // Get all completed attempts for this exam by this user
    const attempts = await prisma.examAttempt.findMany({
      where: {
        examId,
        studentId: userId,
        isCompleted: true,
      },
      include: {
        grade: true,
        exam: {
          select: {
            id: true,
            title: true,
            subject: true,
            totalMarks: true,
            passingMarks: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // Get assignment to know max attempts allowed
    const assignment = await prisma.examAssignment.findFirst({
      where: {
        examId,
        studentId: userId,
      },
      select: {
        maxAttempts: true,
      },
    });

    res.json({
      success: true,
      data: {
        attempts,
        maxAttempts: assignment?.maxAttempts || 1,
        attemptCount: attempts.length,
      },
    });
  } catch (error) {
    console.error('Get exam attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam attempts',
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

    const userId = (req as any).user.id;
    const orgId = (req as any).orgId;
    const userRole = (req as any).user.role;

    // Check if exam exists and belongs to the organization
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        organizationId: true,
        status: true,
      },
    });

    if (!exam || exam.organizationId !== orgId) {
      return res.status(403).json({
        success: false,
        message: 'Exam not found or does not belong to your organization',
      });
    }

    // Allow only creator or admin to publish
    if (exam.creatorId !== userId && userRole !== 'ADMIN') {
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

    const userId = (req as any).user.id;
    const orgId = (req as any).orgId;
    const userRole = (req as any).user.role;

    // Check if exam exists and belongs to the organization
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

    if (!exam || exam.organizationId !== orgId) {
      return res.status(403).json({
        success: false,
        message: 'Exam not found or does not belong to your organization',
      });
    }

    // Allow only creator or admin to delete
    if (exam.creatorId !== userId && userRole !== 'ADMIN') {
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

    const userId = (req as any).user.id;
    const orgId = (req as any).orgId;
    const userRole = (req as any).user.role;

    // Check if exam exists and belongs to the organization
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: true,
      },
    });

    if (!exam || exam.organizationId !== orgId) {
      return res.status(403).json({
        success: false,
        message: 'Exam not found or does not belong to your organization',
      });
    }

    // Only creator or admin can update
    if (exam.creatorId !== userId && userRole !== 'ADMIN') {
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


// ADVANCED MODE: Generate exam with sections
export const generateAdvancedExam = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = (req as any).user.id;
    const orgId = (req as any).orgId;
    const userRole = (req as any).user.role;

    // Optional: Only allow certain roles to generate advanced exams
    if (!['ADMIN', 'TEACHER', 'PARENT'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to generate advanced exams',
      });
    }

    const { generateAdvancedExam: generateExam } = await import('../services/advancedExamGenerator');

    const exam = await generateExam(req.body, userId, orgId); // Pass orgId for tenant isolation

    // Track tier usage
    await incrementTierUsage(userId, 'CREATE_EXAM');

    res.status(201).json({
      success: true,
      data: exam,
      message: 'Advanced exam generated successfully',
    });
  } catch (error: any) {
    console.error('Advanced exam generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate advanced exam',
    });
  }
};


// PDF Upload: Recreate exam from uploaded PDF
export const recreateFromPDF = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = (req as any).user.id;
    const orgId = (req as any).orgId;
    const userRole = (req as any).user.role;

    if (!['ADMIN', 'TEACHER', 'PARENT'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to recreate exams from PDFs',
      });
    }

    const { pdfText } = req.body;
    if (!pdfText) {
      return res.status(400).json({ success: false, message: 'PDF text is required' });
    }

    const { recreateExamFromPDF } = await import('../services/advancedExamGenerator');

    const exam = await recreateExamFromPDF(pdfText, userId, orgId); // Pass orgId for tenant isolation

    // Track tier usage
    await incrementTierUsage(userId, 'CREATE_EXAM');

    res.status(201).json({
      success: true,
      data: exam,
      message: 'Exam recreated from PDF successfully',
    });
  } catch (error: any) {
    console.error('PDF recreation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to recreate exam from PDF',
    });
  }
};


// Get all student results for a specific exam (for teachers/parents)
export const getExamStudentResults = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = (req as any).user.id;
    const orgId = (req as any).orgId;
    const userRole = (req as any).user.role;

    // Only ADMIN, TEACHER, PARENT can access
    if (!['ADMIN', 'TEACHER', 'PARENT'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view student results'
      });
    }

    // Fetch exam for this organization
    const exam = await prisma.exam.findFirst({
      where: { id: examId, organizationId: orgId },
      select: {
        id: true,
        title: true,
        subject: true,
        gradeLevel: true,
        totalMarks: true,
        passingMarks: true,
        duration: true,
        _count: { select: { questions: true } },
      },
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Fetch assignments for students in the same organization
    // Fetch assignments for students in the given organization
    const assignments = await prisma.examAssignment.findMany({
      where: {
        examId,
        student: {
          role: 'STUDENT',
          memberships: {
            some: { orgId: orgId }
          }
        }
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
    });

    // Fetch all completed attempts for this exam and org
    const allAttempts = await prisma.examAttempt.findMany({
      where: {
        examId,
        isCompleted: true,
        student: {
          role: 'STUDENT',
          memberships: {
            some: { orgId: orgId }
          }
        }
      },
      include: { grade: true },
      orderBy: { submittedAt: 'desc' },
    });


    // Map attempts to assignments
    const assignmentMap = new Map(
      assignments.map(a => [a.studentId, { ...a, attempts: allAttempts.filter(at => at.studentId === a.studentId) }])
    );

    // Statistics
    const totalAssigned = assignments.length;
    const studentsCompleted = Array.from(assignmentMap.values()).filter(a => a.attempts.length > 0).length;
    const completionRate = totalAssigned > 0 ? (studentsCompleted / totalAssigned) * 100 : 0;

    const allScores = allAttempts.map(a => a.grade?.percentage || 0).filter(score => score > 0);
    const averageScore = allScores.length > 0 ? allScores.reduce((s, c) => s + c, 0) / allScores.length : 0;
    const passedCount = allScores.filter(score => score >= exam.passingMarks).length;
    const passRate = allScores.length > 0 ? (passedCount / allScores.length) * 100 : 0;
    const highestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
    const lowestScore = allScores.length > 0 ? Math.min(...allScores) : 0;

    // Format student results
    const studentResults = Array.from(assignmentMap.values()).map(a => {
      const bestAttempt = a.attempts.length > 0
        ? a.attempts.reduce((best, current) => (current.grade?.totalScore || 0) > (best.grade?.totalScore || 0) ? current : best)
        : null;

      const percentage = bestAttempt?.grade?.percentage || 0;
      return {
        studentId: a.student?.id || '',
        studentName: a.student?.name || 'Unknown',
        studentEmail: a.student?.email || '',
        assignedAt: a.createdAt,
        maxAttempts: a.maxAttempts,
        attemptsUsed: a.attemptsUsed || 0,
        totalAttempts: a.attempts.length,
        status: a.attempts.length > 0 ? 'COMPLETED' : 'NOT_STARTED',
        bestScore: bestAttempt?.grade?.totalScore || 0,
        bestPercentage: percentage,
        bestGrade: bestAttempt?.grade?.grade || (percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F'),
        passed: percentage >= exam.passingMarks,
        lastAttemptDate: bestAttempt?.submittedAt || null,
        attempts: a.attempts.map(attempt => ({
          id: attempt.id,
          score: attempt.grade?.totalScore || 0,
          percentage: attempt.grade?.percentage || 0,
          grade: attempt.grade?.grade || 'N/A',
          submittedAt: attempt.submittedAt,
          timeSpent: attempt.timeSpent,
        })),
      };
    });

    res.json({
      success: true,
      data: {
        exam: { ...exam, questionCount: exam._count.questions },
        statistics: { totalAssigned, studentsCompleted, completionRate, averageScore, passRate, highestScore, lowestScore, totalAttempts: allScores.length },
        studentResults: studentResults.sort((a, b) => (a.status !== b.status ? a.status === 'COMPLETED' ? -1 : 1 : b.bestPercentage - a.bestPercentage)),
      },
    });
  } catch (error) {
    console.error('Get exam student results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student results',
    });
  }
};