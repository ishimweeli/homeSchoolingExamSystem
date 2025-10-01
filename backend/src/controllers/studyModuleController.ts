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
const createStudyModuleSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  topic: z.string(),
  subject: z.string(),
  gradeLevel: z.number().min(1).max(12),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  totalLessons: z.number().min(1).max(50).default(10),
  passingScore: z.number().min(50).max(100).default(80),
  livesEnabled: z.boolean().default(true),
  maxLives: z.number().min(1).max(10).default(3),
  xpReward: z.number().min(10).max(1000).default(100),
  badgeType: z.string().optional(),
});

const generateStudyModuleSchema = z.object({
  subject: z.string(),
  gradeLevel: z.number().min(1).max(12),
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  lessonCount: z.number().min(1).max(20).default(10),
  includeGamification: z.boolean().default(true),
});

const submitStepAnswerSchema = z.object({
  stepId: z.string(),
  answer: z.any(),
  timeSpent: z.number(),
});

// Create study module manually
export const createStudyModule = async (req: Request, res: Response) => {
  try {
    const validatedData = createStudyModuleSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const studyModule = await prisma.studyModule.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        topic: validatedData.topic,
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        difficulty: validatedData.difficulty,
        totalLessons: validatedData.totalLessons,
        passingScore: validatedData.passingScore,
        livesEnabled: validatedData.livesEnabled,
        maxLives: validatedData.maxLives,
        xpReward: validatedData.xpReward,
        badgeType: validatedData.badgeType,
        createdBy: (req as any).user.id,
        aiGenerated: false,
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: studyModule,
    });
  } catch (error) {
    console.error('Create study module error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof z.ZodError ? 'Validation error' : 'Failed to create study module',
      errors: error instanceof z.ZodError ? error.errors : undefined,
    });
  }
};

// Generate study module with AI (Duolingo-style)
export const generateStudyModuleWithAI = async (req: Request, res: Response) => {
  try {
    const validatedData = generateStudyModuleSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const openaiClient = getOpenAI();
    if (!openaiClient) {
      return res.status(503).json({
        success: false,
        message: 'AI generation is not available. OpenAI API key is missing.'
      });
    }

    // Build prompt for AI to create interactive lessons
    const prompt = `Create an interactive, Duolingo-style study module with the following specifications:
    - Subject: ${validatedData.subject}
    - Grade Level: ${validatedData.gradeLevel}
    - Topic: ${validatedData.topic}
    - Difficulty: ${validatedData.difficulty}
    - Number of Lessons: ${validatedData.lessonCount}
    ${validatedData.includeGamification ? '- Include gamification elements (XP points, achievements)' : ''}

    Create ${validatedData.lessonCount} progressive lessons that build upon each other.
    Each lesson should have:
    1. A brief theory/explanation section
    2. 3-5 interactive practice exercises (multiple choice, fill-in-blank, matching)
    3. A quiz section
    4. Clear learning objectives

    Return as JSON with this structure:
    {
      "title": "Module Title",
      "description": "Module Description",
      "lessons": [{
        "lessonNumber": 1,
        "title": "Lesson Title",
        "content": {
          "theory": "Brief explanation...",
          "objectives": ["Objective 1", "Objective 2"],
          "keyTerms": ["term1", "term2"]
        },
        "steps": [{
          "type": "THEORY",
          "title": "Introduction",
          "content": {
            "text": "Theory content...",
            "examples": ["example1", "example2"]
          }
        }, {
          "type": "PRACTICE_EASY",
          "title": "Practice",
          "content": {
            "question": "Question text",
            "type": "multiple_choice",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": "A",
            "explanation": "Why this is correct"
          }
        }]
      }],
      "xpRewards": {
        "perLesson": 10,
        "completion": 100
      },
      "badges": ["Beginner", "Intermediate", "Expert"]
    }`;

    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educator creating interactive, engaging study modules similar to Duolingo. Focus on bite-sized, progressive learning with immediate feedback.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const aiResponse = completion.choices[0].message.content;
    const moduleData = JSON.parse(aiResponse || '{}');

    // Create study module with lessons and steps
    const studyModule = await prisma.studyModule.create({
      data: {
        title: moduleData.title || `${validatedData.subject} - ${validatedData.topic}`,
        description: moduleData.description,
        topic: validatedData.topic,
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        difficulty: validatedData.difficulty,
        totalLessons: validatedData.lessonCount,
        passingScore: 80,
        livesEnabled: true,
        maxLives: 3,
        xpReward: moduleData.xpRewards?.completion || 100,
        badgeType: moduleData.badges?.[0],
        createdBy: (req as any).user.id,
        aiGenerated: true,
        lessons: {
          create: moduleData.lessons.map((lesson: any, index: number) => ({
            lessonNumber: index + 1,
            title: lesson.title,
            content: lesson.content,
            minScore: 80,
            maxAttempts: 3,
            xpReward: moduleData.xpRewards?.perLesson || 10,
            order: index + 1,
            steps: {
              create: lesson.steps.map((step: any, stepIndex: number) => ({
                stepNumber: stepIndex + 1,
                type: step.type,
                title: step.title,
                content: step.content,
                passingScore: 80,
                order: stepIndex + 1,
              })),
            },
          })),
        },
      },
      include: {
        lessons: {
          include: {
            steps: true,
          },
        },
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: studyModule,
    });
  } catch (error) {
    console.error('Generate study module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate study module',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get all study modules
export const getStudyModules = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { page = 1, limit = 10, subject, gradeLevel, difficulty } = req.query;

    const where: any = {};

    // Filter based on user role
    if ((req as any).user.role === 'STUDENT') {
      // Students see assigned modules
      where.assignments = {
        some: {
          studentId: (req as any).user.id,
        },
      };
    } else {
      // Teachers/Parents see their created modules
      where.createdBy = (req as any).user.id;
    }

    if (subject) where.subject = subject;
    if (gradeLevel) where.gradeLevel = Number(gradeLevel);
    if (difficulty) where.difficulty = difficulty;

    const modules = await prisma.studyModule.findMany({
      where,
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            assignments: true,
          },
        },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await prisma.studyModule.count({ where });

    res.json({
      success: true,
      data: modules,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get study modules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch study modules',
    });
  }
};

// Get single study module with lessons
export const getStudyModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const module = await prisma.studyModule.findUnique({
      where: { id },
      include: {
        lessons: {
          include: {
            steps: true,
          },
          orderBy: {
            lessonNumber: 'asc',
          },
        },
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Study module not found',
      });
    }

    res.json({
      success: true,
      data: module,
    });
  } catch (error) {
    console.error('Get study module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch study module',
    });
  }
};

// Assign study module to students
export const assignStudyModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentIds, dueDate, instructions } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if user owns the module
    const module = await prisma.studyModule.findUnique({
      where: { id },
    });

    if (!module || module.createdBy !== (req as any).user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign your own study modules',
      });
    }

    // Ensure ownership
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
    const existingAssignments = await prisma.studyModuleAssignment.findMany({
      where: {
        moduleId: id,
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
        message: `Study module already assigned to: ${duplicateStudents}. Cannot assign the same module twice to a student.`,
        duplicates: existingAssignments
      });
    }

    const assignments = await prisma.studyModuleAssignment.createMany({
      data: studentIds.map((studentId: string) => ({
        moduleId: id,
        studentId,
        assignedBy: (req as any).user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        instructions,
        currentLesson: 1,
        currentStep: 1,
        overallProgress: 0,
        totalXp: 0,
        lives: module.maxLives,
        streak: 0,
        status: 'IN_PROGRESS',
        averageScore: 0,
        totalAttempts: 0,
      })),
    });

    res.json({
      success: true,
      message: `Study module assigned to ${assignments.count} students`,
      data: assignments,
    });
  } catch (error) {
    console.error('Assign study module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign study module',
    });
  }
};

// Start or continue study module
export const startStudyModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if student has assignment
    let assignment = await prisma.studyModuleAssignment.findFirst({
      where: {
        moduleId: id,
        studentId: (req as any).user.id,
      },
      include: {
        module: {
          include: {
            lessons: {
              include: {
                steps: true,
              },
              orderBy: {
                lessonNumber: 'asc',
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      // Create self-assignment for practice
      const module = await prisma.studyModule.findUnique({
        where: { id },
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Study module not found',
        });
      }

      assignment = await prisma.studyModuleAssignment.create({
        data: {
          moduleId: id,
          studentId: (req as any).user.id,
          assignedBy: (req as any).user.id,
          currentLesson: 1,
          currentStep: 1,
          overallProgress: 0,
          totalXp: 0,
          lives: module.maxLives,
          streak: 0,
          status: 'IN_PROGRESS',
          averageScore: 0,
          totalAttempts: 0,
        },
        include: {
          module: {
            include: {
              lessons: {
                include: {
                  steps: true,
                },
                orderBy: {
                  lessonNumber: 'asc',
                },
              },
            },
          },
        },
      });
    }

    // Get or create progress
    let progress = await prisma.studyProgress.findFirst({
      where: {
        moduleId: id,
        studentId: (req as any).user.id,
      },
    });

    if (!progress) {
      progress = await prisma.studyProgress.create({
        data: {
          moduleId: id,
          studentId: (req as any).user.id,
          currentLessonNumber: assignment.currentLesson,
          currentStepNumber: assignment.currentStep,
          totalXP: 0,
          livesRemaining: assignment.module.maxLives,
          streak: 0,
        },
      });
    }

    // Update last active time
    await prisma.studyModuleAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        lastActiveAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        assignment,
        progress,
        currentLesson: assignment.module.lessons.find(l => l.lessonNumber === assignment.currentLesson),
      },
    });
  } catch (error) {
    console.error('Start study module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start study module',
    });
  }
};

// Submit answer for a step (interactive learning)
export const submitStepAnswer = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    const { stepId, answer, timeSpent } = submitStepAnswerSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get the step
    const step = await prisma.studyStep.findUnique({
      where: { id: stepId },
      include: {
        lesson: {
          include: {
            module: true,
          },
        },
      },
    });

    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Step not found',
      });
    }

    // Check answer (simplified - in real app, implement proper checking)
    const content = step.content as any;
    const isCorrect = content.correctAnswer === answer;
    const score = isCorrect ? 100 : 0;

    // Get student progress
    const progress = await prisma.studyProgress.findFirst({
      where: {
        moduleId,
        studentId: (req as any).user.id,
      },
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress not found',
      });
    }

    // Record attempt
    const attemptNumber = await prisma.studentStepProgress.count({
      where: {
        stepId,
        studentId: (req as any).user.id,
      },
    }) + 1;

    await prisma.studentStepProgress.create({
      data: {
        stepId,
        studentId: (req as any).user.id,
        attemptNumber,
        score,
        answers: answer,
        timeSpent,
        passed: score >= (step.passingScore || 80),
      },
    });

    // Update progress if passed
    if (score >= (step.passingScore || 80)) {
      // Award XP
      const xpEarned = 10; // Base XP per step

      await prisma.studyProgress.update({
        where: { id: progress.id },
        data: {
          totalXP: progress.totalXP + xpEarned,
          currentStepNumber: step.stepNumber + 1,
        },
      });

      // Check if lesson completed
      const nextStep = await prisma.studyStep.findFirst({
        where: {
          lessonId: step.lessonId,
          stepNumber: step.stepNumber + 1,
        },
      });

      if (!nextStep) {
        // Move to next lesson
        await prisma.studyProgress.update({
          where: { id: progress.id },
          data: {
            currentLessonNumber: step.lesson.lessonNumber + 1,
            currentStepNumber: 1,
          },
        });

        // Award lesson completion XP
        const lessonXP = step.lesson.xpReward || 50;
        await prisma.studyProgress.update({
          where: { id: progress.id },
          data: {
            totalXP: progress.totalXP + xpEarned + lessonXP,
          },
        });
      }
    } else {
      // Lose a life if incorrect
      if (step.lesson.module.livesEnabled && progress.livesRemaining > 0) {
        await prisma.studyProgress.update({
          where: { id: progress.id },
          data: {
            livesRemaining: progress.livesRemaining - 1,
          },
        });
      }
    }

    res.json({
      success: true,
      data: {
        correct: isCorrect,
        score,
        xpEarned: isCorrect ? 10 : 0,
        livesRemaining: progress.livesRemaining - (isCorrect ? 0 : 1),
        feedback: content.explanation || (isCorrect ? 'Correct!' : 'Try again!'),
      },
    });
  } catch (error) {
    console.error('Submit step answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
    });
  }
};

// Get student progress for a module
export const getStudentProgress = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const progress = await prisma.studyProgress.findFirst({
      where: {
        moduleId,
        studentId: (req as any).user.id,
      },
      include: {
        module: {
          include: {
            lessons: {
              include: {
                steps: true,
              },
            },
          },
        },
        completedSteps: true,
      },
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress found for this module',
      });
    }

    // Calculate overall progress
    const totalSteps = progress.module.lessons.reduce(
      (sum, lesson) => sum + lesson.steps.length,
      0
    );
    const completedSteps = progress.completedSteps.length;
    const overallProgress = (completedSteps / totalSteps) * 100;

    res.json({
      success: true,
      data: {
        ...progress,
        overallProgress,
        completedSteps,
        totalSteps,
      },
    });
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress',
    });
  }
};

// Get leaderboard for a module
export const getModuleLeaderboard = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;

    const leaderboard = await prisma.studyProgress.findMany({
      where: {
        moduleId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        {
          totalXP: 'desc',
        },
        {
          streak: 'desc',
        },
      ],
      take: 10,
    });

    res.json({
      success: true,
      data: leaderboard.map((entry, index) => ({
        rank: index + 1,
        studentId: entry.student.id,
        studentName: entry.student.name,
        totalXP: entry.totalXP,
        streak: entry.streak,
        currentLesson: entry.currentLessonNumber,
      })),
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
    });
  }
};