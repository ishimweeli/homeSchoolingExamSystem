import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { incrementTierUsage } from '../middleware/tierLimits';
import { getAIClient, getAIModel, isAIAvailable } from '../utils/aiClient';
import { generateStudyModulePrompt } from '../services/aiPromptService';

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
  gradeLevel: z.number().min(0).max(13), // 0 = All levels, 1-12 for K-12, 13 for University
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  lessonCount: z.number().min(1).max(10).default(10), // Maximum 10 lessons for 100% reliability
  includeGamification: z.boolean().default(true),
  country: z.enum(['USA', 'UK', 'AUSTRALIA', 'NEW_ZEALAND', 'RWANDA', 'GENERAL']).default('GENERAL'),
});

// 🧩 Step content schema
const stepContentSchema = z.object({
  type: z.string().optional(),
  question: z.string().optional(),
  explanation: z.string().optional(),
  learningText: z.string().optional(),
  correctAnswer: z.union([
    z.string(),
    z.boolean(),
    z.record(z.string(), z.string())
  ]).optional(),
  options: z.array(z.string()).optional(),
  pairs: z.record(z.string(), z.string()).optional(),
  text: z.string().optional(),
  examples: z.array(z.string()).optional(),
});

// 🧩 Step schema
const stepSchema = z.object({
  id: z.string().optional(),
  lessonId: z.string().optional(),
  stepNumber: z.number().optional(),
  type: z.string().optional(),
  title: z.string().optional(),
  content: stepContentSchema.optional(),
  passingScore: z.number().optional(),
  timeLimit: z.number().nullable().optional(),
  order: z.number().optional(),
});

// 🧩 Lesson schema
const lessonSchema = z.object({
  id: z.string().optional(),
  moduleId: z.string().optional(),
  lessonNumber: z.number().optional(),
  title: z.string().optional(),
  content: z.string().optional(), // stored as JSON string
  minScore: z.number().optional(),
  maxAttempts: z.number().optional(),
  xpReward: z.number().optional(),
  order: z.number().optional(),
  steps: z.array(stepSchema).optional(),
});

// 🧩 Main Update Study Module Schema
export const updateStudyModuleSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
  subject: z.string().optional(),
  gradeLevel: z.number().min(0).max(13).optional(),
  aiGenerated: z.boolean().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  totalLessons: z.number().min(1).max(10).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  livesEnabled: z.boolean().optional(),
  maxLives: z.number().min(0).max(10).optional(),
  xpReward: z.number().min(0).optional(),
  badgeType: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  includeGamification: z.boolean().optional(),
  country: z.enum(["USA", "UK", "AUSTRALIA", "NEW_ZEALAND", "RWANDA", "GENERAL"]).optional(),
  lessons: z.array(lessonSchema).optional(),
  topics: z.array(z.string()).optional(),
  updatedAt: z.string().datetime().optional(),
});


const submitStepAnswerSchema = z.object({
  stepId: z.string(),
  answer: z.any(),
  timeSpent: z.number(),
});

interface BatchGenerationResult {
  lessons: any[];
  error?: string;
}

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

// Helper function to fix malformed JSON from AI
function fixMalformedJSON(jsonString: string): string {
  // Remove completely invalid control characters
  let fixed = jsonString.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '');

  // Try to intelligently fix newlines and tabs inside string values
  // This is a heuristic approach - replace literal newlines that appear between quotes
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < fixed.length; i++) {
    const char = fixed[i];
    const prevChar = i > 0 ? fixed[i - 1] : '';

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"' && prevChar !== '\\') {
      inString = !inString;
      result += char;
      continue;
    }

    // If we're inside a string, escape literal newlines and tabs
    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  return result;
}

// Generate course OUTLINE only (Step 1 - Fast & Small)
export const generateCourseOutline = async (req: Request, res: Response) => {
  try {
    const validatedData = generateStudyModuleSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const aiClient = getAIClient();
    if (!aiClient || !isAIAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'AI generation is not available. OpenRouter API key is missing.'
      });
    }

    const { subject, gradeLevel, topic, lessonCount, country = 'GENERAL' } = validatedData;

    // Simple prompt for outline generation (very small - ~500-1000 tokens output)
    const outlinePrompt = `Generate a course outline for "${topic}" in ${subject}.

    Requirements:
    - Number of lessons: ${lessonCount}
    - Grade level: ${gradeLevel === 0 ? 'All levels (Complete Course)' : `Grade ${gradeLevel}`}
    - Country: ${country}

    For each lesson, provide:
    1. Lesson number
    2. Lesson title (specific, actionable)
    3. Brief description (2-3 sentences what students will learn)
    4. Key concepts covered (3-5 bullet points)

    Progression should go from basics → intermediate → advanced → mastery.

    Return ONLY valid JSON (no markdown):
    {
      "courseTitle": "Course Title",
      "courseDescription": "Brief description of the complete course",
      "totalLessons": ${lessonCount},
      "lessons": [
        {
          "lessonNumber": 1,
          "title": "Lesson Title",
          "description": "What students will learn",
          "keyConcepts": ["concept1", "concept2", "concept3"]
        }
      ]
    }`;

    console.log('📋 Generating course outline...');

    const completion = await aiClient.chat.completions.create(
      {
        model: getAIModel(),
        messages: [
          {
            role: 'system',
            content: 'You are an expert curriculum designer. Generate clear, progressive course outlines.',
          },
          {
            role: 'user',
            content: outlinePrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000, // Small - just outline
      },
      {
        timeout: 30000, // 30 second timeout (outline is fast)
      }
    );

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('AI did not return any content');
    }

    // Clean and parse response
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const outlineData = JSON.parse(cleanedResponse);

    // Create module with outline only (no lessons yet)
    const studyModule = await prisma.studyModule.create({
      data: {
        title: outlineData.courseTitle || `${subject} - ${topic}`,
        description: outlineData.courseDescription || `Course on ${topic}`,
        topic,
        subject,
        gradeLevel,
        difficulty: validatedData.difficulty,
        totalLessons: lessonCount,
        passingScore: 80,
        livesEnabled: true,
        maxLives: 3,
        xpReward: 100,
        createdBy: (req as any).user.id,
        aiGenerated: true,
        // Lessons will be generated individually later
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

    console.log('✅ Course outline created:', studyModule.id);

    res.status(201).json({
      success: true,
      data: {
        module: studyModule,
        outline: outlineData.lessons,
      },
      message: `Course outline created with ${lessonCount} lessons. Generate each lesson individually.`,
    });
  } catch (error) {
    console.error('❌ Generate outline error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate outline',
    });
  }
};

async function generateLessonBatch(
  params: {
    subject: string;
    gradeLevel: number;
    topic: string;
    difficulty: string;
    batchSize: number;
    batchStartLesson: number;
    totalLessonsInCourse: number;
    previousLessons: string;
    includeGamification: boolean;
    country: string;
  },
  aiClient: any
): Promise<BatchGenerationResult> {
  const { batchStartLesson, batchSize, totalLessonsInCourse } = params;

  console.log(`🔄 Generating lessons ${batchStartLesson}-${batchStartLesson + batchSize - 1} of ${totalLessonsInCourse}`);

  const promptConfig = generateStudyModulePrompt({
    subject: params.subject,
    gradeLevel: params.gradeLevel,
    topic: params.topic,
    difficulty: params.difficulty,
    lessonCount: batchSize,
    includeGamification: params.includeGamification,
    country: params.country,
    batchStartLesson,
    totalLessonsInCourse,
    previousLessons: params.previousLessons,
  });

  try {
    const completion = await aiClient.chat.completions.create(
      {
        model: getAIModel(),
        messages: [
          { role: 'system', content: promptConfig.systemMessage },
          { role: 'user', content: promptConfig.userPrompt },
        ],
        temperature: promptConfig.temperature,
        max_tokens: promptConfig.maxTokens,
      },
      { timeout: 90000 } // 90 second timeout
    );

    console.log(`✅ Batch ${batchStartLesson}-${batchStartLesson + batchSize - 1} completed`);
    console.log('  - Usage:', completion.usage);

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('AI returned no content');
    }

    // Clean response
    let cleaned = aiResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    // Fix malformed JSON
    cleaned = fixMalformedJSON(cleaned);

    // Parse JSON
    const batchData = JSON.parse(cleaned);

    if (!batchData.lessons || !Array.isArray(batchData.lessons)) {
      throw new Error('Invalid response structure: missing lessons array');
    }

    console.log(`✅ Parsed ${batchData.lessons.length} lessons from batch`);

    return { lessons: batchData.lessons };
  } catch (error) {
    console.error(`❌ Failed to generate batch ${batchStartLesson}-${batchStartLesson + batchSize - 1}:`, error);
    return {
      lessons: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


// Generate study module with AI (Duolingo-style)
export const generateStudyModuleWithAI = async (req: Request, res: Response) => {
  try {
    const validatedData = generateStudyModuleSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const aiClient = getAIClient();
    if (!aiClient || !isAIAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'AI generation is not available. OpenRouter API key is missing.'
      });
    }

    const BATCH_SIZE = 2; // Generate 2 lessons at a time
    const totalLessons = validatedData.lessonCount;
    const batches = Math.ceil(totalLessons / BATCH_SIZE);

    console.log('📦 SEQUENTIAL BATCH GENERATION STRATEGY:');
    console.log(`  - Total lessons requested: ${totalLessons}`);
    console.log(`  - Batch size: ${BATCH_SIZE} lessons`);
    console.log(`  - Total batches: ${batches}`);

    const allLessons: any[] = [];
    let previousLessonsContext = '';

    // Generate lessons batch by batch
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batchStartLesson = batchIndex * BATCH_SIZE + 1;
      const lessonsInThisBatch = Math.min(BATCH_SIZE, totalLessons - allLessons.length);

      console.log(`\n🚀 [BATCH ${batchIndex + 1}/${batches}] Starting generation...`);

      const result = await generateLessonBatch(
        {
          subject: validatedData.subject,
          gradeLevel: validatedData.gradeLevel,
          topic: validatedData.topic,
          difficulty: validatedData.difficulty,
          batchSize: lessonsInThisBatch,
          batchStartLesson,
          totalLessonsInCourse: totalLessons,
          previousLessons: previousLessonsContext,
          includeGamification: validatedData.includeGamification || false,
          country: validatedData.country || 'GENERAL',
        },
        aiClient
      );

      if (result.error || result.lessons.length === 0) {
        console.error(`❌ [BATCH ${batchIndex + 1}] Failed:`, result.error);
        
        // If this is not the first batch and we have some lessons, continue with what we have
        if (allLessons.length > 0) {
          console.warn(`⚠️ Proceeding with ${allLessons.length} successfully generated lessons`);
          break;
        }
        
        // If first batch fails, return error
        throw new Error(`Failed to generate initial lessons: ${result.error}`);
      }

      // Add lessons to collection
      allLessons.push(...result.lessons);

      // Update context for next batch
      const lessonTitles = result.lessons.map((l: any) => `${l.lessonNumber}. ${l.title}`).join('\n    ');
      previousLessonsContext += `\n    ${lessonTitles}`;

      console.log(`✅ [BATCH ${batchIndex + 1}] Complete. Total lessons so far: ${allLessons.length}/${totalLessons}`);

      // Add small delay between batches to avoid rate limiting
      if (batchIndex < batches - 1) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n🎉 GENERATION COMPLETE: ${allLessons.length} lessons generated`);

    // Normalize lessons
    const normalizedLessons = allLessons.map((lesson: any, index: number) => {
      const safeLesson = lesson || {};
      safeLesson.lessonNumber = index + 1; // Ensure correct numbering
      safeLesson.title = safeLesson.title || `Lesson ${index + 1}`;
      safeLesson.content = safeLesson.content || {};
      
      // Ensure curriculum alignment
      if (!Array.isArray(safeLesson.content.curriculumAlignment)) {
        safeLesson.content.curriculumAlignment = [
          {
            standardCode: `${validatedData.subject.toUpperCase()}.G${validatedData.gradeLevel}.${String(validatedData.topic).replace(/\s+/g, '').toUpperCase()}`,
            description: `Grade ${validatedData.gradeLevel} ${validatedData.subject}: Mastery of ${validatedData.topic}`,
          },
        ];
      }

      // Ensure steps array and learningText
      const steps = Array.isArray(safeLesson.steps) ? safeLesson.steps : [];
      
      const normalizedSteps = steps.map((step: any) => {
        if (step.type !== 'THEORY' && step.content && !step.content.learningText) {
          step.content.learningText = `<p>Understanding ${validatedData.topic} requires attention to detail. Review the concept carefully before answering.</p><p>Apply what you've learned to identify the correct answer. Take your time and think through each option.</p>`;
        }
        return step;
      });

      return { ...safeLesson, steps: normalizedSteps };
    });

    // Create study module with all lessons
    const studyModule = await prisma.studyModule.create({
      data: {
        title: `${validatedData.subject} - ${validatedData.topic}`,
        description: `Comprehensive study module on ${validatedData.topic} for Grade ${validatedData.gradeLevel}`,
        topic: validatedData.topic,
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        difficulty: validatedData.difficulty,
        totalLessons: normalizedLessons.length,
        passingScore: 80,
        livesEnabled: true,
        maxLives: 3,
        xpReward: 100,
        badgeType: 'Mastery',
        createdBy: (req as any).user.id,
        aiGenerated: true,
        lessons: {
          create: normalizedLessons.map((lesson: any, index: number) => ({
            lessonNumber: index + 1,
            title: lesson.title,
            content: lesson.content,
            minScore: 80,
            maxAttempts: 3,
            xpReward: 10,
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

    // Increment tier usage
    await incrementTierUsage((req as any).user.id, 'CREATE_STUDY_MODULE');

    console.log(`🎉 Study module created: ${studyModule.title}`);
    console.log(`📊 ${studyModule.lessons.length} lessons, ${studyModule.lessons.reduce((sum, l) => sum + l.steps.length, 0)} total steps`);

    res.status(201).json({
      success: true,
      data: studyModule,
      message: `Study module created with ${studyModule.lessons.length} lessons (generated in ${batches} batches)`,
    });

  } catch (error) {
    console.error('❌ Generate study module error:', error);

    if (error instanceof Error) {
      console.error('  - Error message:', error.message);
      console.error('  - Error stack:', error.stack);
    }

    const errorMessage = error instanceof Error ? error.message : '';

    if (errorMessage.includes('timeout')) {
      return res.status(500).json({
        success: false,
        message: 'AI request timed out. Please try again.',
        error: 'REQUEST_TIMEOUT'
      });
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate study module',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};


export const updateStudyModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ Validate input (ensure `id` exists)
    const validatedData = updateStudyModuleSchema.parse({ ...req.body, id });

    // ✅ Check ownership
    const existingModule = await prisma.studyModule.findUnique({
      where: { id },
      include: { lessons: { include: { steps: true } } },
    });

    if (!existingModule) {
      return res.status(404).json({ success: false, message: "Module not found" });
    }

    if (existingModule.createdBy !== (req as any).user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own modules",
      });
    }

    // ✅ Extract top-level and nested data
    const { lessons, ...rest } = validatedData;

    // ✅ Update module itself
    const updatedModule = await prisma.studyModule.update({
      where: { id },
      data: {
        ...rest,
        // Prisma handles updatedAt automatically (@updatedAt)
      },
    });

    // ✅ Handle nested lessons + steps
    if (lessons && lessons.length > 0) {
      for (const lesson of lessons) {
        // 🧩 Update existing lesson
        if (lesson.id) {
          await prisma.studyLesson.update({
            where: { id: lesson.id },
            data: {
              title: lesson.title,
              lessonNumber: lesson.lessonNumber,
              content: lesson.content ? JSON.parse(lesson.content) : undefined,
              minScore: lesson.minScore,
              maxAttempts: lesson.maxAttempts,
              xpReward: lesson.xpReward,
              order: lesson.order,
            },
          });

          // 🧩 Update or create lesson steps
          if (lesson.steps && lesson.steps.length > 0) {
            for (const step of lesson.steps) {
              if (step.id) {
                await prisma.studyStep.update({
                  where: { id: step.id },
                  data: {
                    title: step.title,
                    type: step.type as any,
                    stepNumber: step.stepNumber,
                    content: step.content,
                    passingScore: step.passingScore,
                    timeLimit: step.timeLimit ?? null,
                    order: step.order,
                  },
                });
              } else {
                // Create new step if it doesn’t exist
                await prisma.studyStep.create({
                  data: {
                    lessonId: lesson.id!,
                    title: step.title ?? "Untitled Step",
                    type: step.type as any,
                    stepNumber: step.stepNumber ?? 1,
                    content: step.content ?? {},
                    passingScore: step.passingScore ?? 80,
                    timeLimit: step.timeLimit ?? null,
                    order: step.order ?? 1,
                  },
                });
              }
            }
          }
        } else {
          // 🧩 Create new lesson (if new)
          const createdLesson = await prisma.studyLesson.create({
            data: {
              moduleId: id,
              title: lesson.title ?? "Untitled Lesson",
              lessonNumber: lesson.lessonNumber ?? 1,
              content: lesson.content ? JSON.parse(lesson.content) : {},
              minScore: lesson.minScore ?? 80,
              maxAttempts: lesson.maxAttempts ?? 3,
              xpReward: lesson.xpReward ?? 10,
              order: lesson.order ?? 1,
            },
          });

          // Create nested steps if provided
          if (lesson.steps && lesson.steps.length > 0) {
            await prisma.studyStep.createMany({
              data: lesson.steps.map((step) => ({
                lessonId: createdLesson.id,
                title: step.title ?? "Untitled Step",
                type: step.type as any,
                stepNumber: step.stepNumber ?? 1,
                content: step.content ?? {},
                passingScore: step.passingScore ?? 80,
                timeLimit: step.timeLimit ?? null,
                order: step.order ?? 1,
              })),
            });
          }
        }
      }
    }

    return res.json({
      success: true,
      data: updatedModule,
      message: "Study module updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    console.error("Update study module error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update study module",
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

// Update student progress (save current lesson/step position)
export const updateModuleProgress = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    const { currentLesson, currentStep, xpEarned = 0 } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log(`💾 Saving progress: Lesson ${currentLesson}, Step ${currentStep}`);

    // Get module with lessons to calculate progress
    const module = await prisma.studyModule.findUnique({
      where: { id: moduleId },
      include: {
        lessons: {
          include: { steps: true },
          orderBy: { lessonNumber: 'asc' },
        },
      },
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }

    // Update assignment
    const assignment = await prisma.studyModuleAssignment.findFirst({
      where: {
        moduleId,
        studentId: (req as any).user.id,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Calculate overall progress
    const totalLessons = module.lessons.length;
    const totalSteps = module.lessons.reduce((sum, lesson) => sum + lesson.steps.length, 0);

    // Calculate completed steps (all steps before current position)
    let completedSteps = 0;
    for (let i = 0; i < currentLesson - 1; i++) {
      const lesson = module.lessons.find(l => l.lessonNumber === i + 1);
      if (lesson) {
        completedSteps += lesson.steps.length;
      }
    }
    // Add steps completed in current lesson
    completedSteps += currentStep - 1;

    const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    console.log(`📊 Progress calculation: ${completedSteps}/${totalSteps} steps = ${overallProgress}%`);

    // Update assignment progress
    await prisma.studyModuleAssignment.update({
      where: { id: assignment.id },
      data: {
        currentLesson,
        currentStep,
        overallProgress,
        totalXp: assignment.totalXp + xpEarned,
        lastActiveAt: new Date(),
      },
    });

    // Update progress record
    const progress = await prisma.studyProgress.findFirst({
      where: {
        moduleId,
        studentId: (req as any).user.id,
      },
    });

    if (progress) {
      await prisma.studyProgress.update({
        where: { id: progress.id },
        data: {
          currentLessonNumber: currentLesson,
          currentStepNumber: currentStep,
          totalXP: progress.totalXP + xpEarned,
          lastAccessedAt: new Date(),
        },
      });
    }

    console.log(`✅ Progress saved successfully`);

    res.json({
      success: true,
      message: 'Progress saved',
      data: {
        currentLesson,
        currentStep,
        totalXp: assignment.totalXp + xpEarned,
      },
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress',
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

// Publish study module
export const publishStudyModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const module = await prisma.studyModule.findUnique({
      where: { id },
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Study module not found',
      });
    }

    if (module.createdBy !== (req as any).user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only publish your own modules',
      });
    }

    const updatedModule = await prisma.studyModule.update({
      where: { id },
      data: ({ status: 'PUBLISHED' } as any),
    });

    res.json({
      success: true,
      data: updatedModule,
      message: 'Module published successfully',
    });
  } catch (error) {
    console.error('Publish module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish module',
    });
  }
};

// Generate ALL lessons sequentially for a module (Step 2 - Auto mode)
export const generateAllLessons = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    const { outline } = req.body; // Array of {lessonNumber, title, description, keyConcepts}

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get the module
    const module = await prisma.studyModule.findUnique({
      where: { id: moduleId },
      include: {
        lessons: true,
      },
    });

    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    if (module.createdBy !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const aiClient = getAIClient();
    if (!aiClient || !isAIAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'AI generation is not available.'
      });
    }

    console.log(`🚀 Starting generation of ${outline.length} lessons for "${module.title}"`);

    const generatedLessons: any[] = [];
    const errors: any[] = [];

    // Generate each lesson sequentially
    for (const lessonOutline of outline) {
      const { lessonNumber, title, description, keyConcepts } = lessonOutline;

      // Skip if already exists
      const existingLesson = module.lessons.find((l) => l.lessonNumber === lessonNumber);
      if (existingLesson) {
        console.log(`⏭️  Lesson ${lessonNumber} already exists, skipping`);
        generatedLessons.push(existingLesson);
        continue;
      }

      try {
        console.log(`🎓 [${lessonNumber}/${outline.length}] Generating: ${title}`);

        const promptConfig = generateStudyModulePrompt({
          subject: module.subject,
          gradeLevel: module.gradeLevel,
          topic: module.topic,
          difficulty: module.difficulty,
          lessonCount: 1,
          includeGamification: true,
          country: 'GENERAL',
        });

        const singleLessonPrompt = `Generate ONLY lesson ${lessonNumber} for the course "${module.title}".

        Lesson ${lessonNumber}: ${title}
        Description: ${description}
        Key Concepts: ${Array.isArray(keyConcepts) ? keyConcepts.join(', ') : keyConcepts}

        ${promptConfig.userPrompt}

        IMPORTANT: Generate ONLY THIS ONE LESSON with full 8 steps (THEORY + 7 exercises).
        Return JSON with this structure (no markdown):
        {
          "lesson": {
            "lessonNumber": ${lessonNumber},
            "title": "${title}",
            "content": {
              "theory": "...",
              "objectives": [],
              "keyTerms": [],
              "curriculumAlignment": []
            },
            "steps": [/* 8 steps as specified */]
          }
        }`;

        const completion = await aiClient.chat.completions.create(
          {
            model: getAIModel(),
            messages: [
              {
                role: 'system',
                content: promptConfig.systemMessage,
              },
              {
                role: 'user',
                content: singleLessonPrompt,
              },
            ],
            temperature: 0.8,
            max_tokens: 12000,
          },
          {
            timeout: 60000,
          }
        );

        const aiResponse = completion.choices[0].message.content;
        if (!aiResponse) {
          throw new Error('AI did not return any content');
        }

        // Clean and parse
        let cleanedResponse = aiResponse.trim();
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const lessonData = JSON.parse(cleanedResponse);
        const lesson = lessonData.lesson;

        if (!lesson || !lesson.steps || lesson.steps.length === 0) {
          throw new Error('Invalid lesson structure from AI');
        }

        // Create the lesson in database
        const createdLesson = await prisma.studyLesson.create({
          data: {
            moduleId: module.id,
            lessonNumber: lessonNumber,
            title: lesson.title,
            content: lesson.content,
            minScore: 80,
            maxAttempts: 3,
            xpReward: 15,
            order: lessonNumber,
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
          },
          include: {
            steps: true,
          },
        });

        console.log(`✅ [${lessonNumber}/${outline.length}] Lesson created with ${createdLesson.steps.length} steps`);
        generatedLessons.push(createdLesson);

        // Small delay between lessons to avoid rate limits
        if (lessonNumber < outline.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        }
      } catch (lessonError: any) {
        console.error(`❌ Failed to generate lesson ${lessonNumber}:`, lessonError.message);
        errors.push({
          lessonNumber,
          title,
          error: lessonError.message,
        });
        // Continue with next lesson even if one fails
      }
    }

    console.log(`🎉 Generation complete! ${generatedLessons.length}/${outline.length} lessons created`);

    res.status(201).json({
      success: true,
      data: {
        module,
        generatedLessons,
        totalGenerated: generatedLessons.length,
        totalRequested: outline.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `Generated ${generatedLessons.length}/${outline.length} lessons successfully`,
    });
  } catch (error) {
    console.error('❌ Generate all lessons error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate lessons',
    });
  }
};

// Generate SINGLE lesson for existing module (Step 2 - One lesson at a time)
export const generateSingleLesson = async (req: Request, res: Response) => {
  try {
    const { moduleId, lessonNumber } = req.params;
    const { lessonTitle, lessonDescription, keyConcepts } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get the module
    const module = await prisma.studyModule.findUnique({
      where: { id: moduleId },
      include: {
        lessons: true,
      },
    });

    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    if (module.createdBy !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check if lesson already exists
    const existingLesson = module.lessons.find((l) => l.lessonNumber === parseInt(lessonNumber));
    if (existingLesson) {
      return res.status(400).json({ success: false, message: 'Lesson already generated. Delete it first to regenerate.' });
    }

    const aiClient = getAIClient();
    if (!aiClient || !isAIAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'AI generation is not available.'
      });
    }

    console.log(`🎓 Generating Lesson ${lessonNumber}: ${lessonTitle}`);

    // Generate detailed prompt for this specific lesson
    const promptConfig = generateStudyModulePrompt({
      subject: module.subject,
      gradeLevel: module.gradeLevel,
      topic: module.topic,
      difficulty: module.difficulty,
      lessonCount: 1, // Just ONE lesson
      includeGamification: true,
      country: 'GENERAL',
    });

    // Customize prompt for single lesson
    const singleLessonPrompt = `Generate ONLY lesson ${lessonNumber} for the course "${module.title}".

    Lesson ${lessonNumber}: ${lessonTitle}
    Description: ${lessonDescription}
    Key Concepts: ${Array.isArray(keyConcepts) ? keyConcepts.join(', ') : keyConcepts}

    ${promptConfig.userPrompt}

    IMPORTANT: Generate ONLY THIS ONE LESSON with full 8 steps (THEORY + 7 exercises).
    Return JSON with this structure (no markdown):
    {
      "lesson": {
        "lessonNumber": ${lessonNumber},
        "title": "${lessonTitle}",
        "content": {
          "theory": "...",
          "objectives": [],
          "keyTerms": [],
          "curriculumAlignment": []
        },
        "steps": [/* 8 steps as specified */]
      }
    }`;

    const completion = await aiClient.chat.completions.create(
      {
        model: getAIModel(),
        messages: [
          {
            role: 'system',
            content: promptConfig.systemMessage,
          },
          {
            role: 'user',
            content: singleLessonPrompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 12000, // Enough for 1 detailed lesson with 8 steps
      },
      {
        timeout: 60000, // 60 second timeout
      }
    );

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('AI did not return any content');
    }

    console.log('📝 AI response received, parsing...');

    // Clean and parse
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const lessonData = JSON.parse(cleanedResponse);
    const lesson = lessonData.lesson;

    if (!lesson || !lesson.steps || lesson.steps.length === 0) {
      throw new Error('Invalid lesson structure from AI');
    }

    console.log(`✅ Parsed lesson with ${lesson.steps.length} steps`);

    // Create the lesson in database
    const createdLesson = await prisma.studyLesson.create({
      data: {
        moduleId: module.id,
        lessonNumber: parseInt(lessonNumber),
        title: lesson.title,
        content: lesson.content,
        minScore: 80,
        maxAttempts: 3,
        xpReward: 15,
        order: parseInt(lessonNumber),
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
      },
      include: {
        steps: true,
      },
    });

    console.log(`🎉 Lesson ${lessonNumber} created successfully with ${createdLesson.steps.length} steps`);

    res.status(201).json({
      success: true,
      data: createdLesson,
      message: `Lesson ${lessonNumber} generated successfully`,
    });
  } catch (error) {
    console.error('❌ Generate lesson error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate lesson',
    });
  }
};

// Delete study module
export const deleteStudyModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const module = await prisma.studyModule.findUnique({
      where: { id },
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Study module not found',
      });
    }

    if (module.createdBy !== (req as any).user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own modules',
      });
    }

    await prisma.studyModule.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Module deleted successfully',
    });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete module',
    });
  }
};

// Get module assignments (for assignment modal)
export const getModuleAssignments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const assignments = await prisma.studyModuleAssignment.findMany({
      where: { moduleId: id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
    console.error('Get module assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
    });
  }
};

// Get student progress for a module (Teacher/Parent view)
export const getModuleStudentProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userRole = (req as any).user.role;
    if (userRole !== 'TEACHER' && userRole !== 'PARENT') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and parents can view student progress',
      });
    }

    // Get module details
    const module = await prisma.studyModule.findUnique({
      where: { id },
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }

    // Get all assignments for this module
    const assignments = await prisma.studyModuleAssignment.findMany({
      where: { moduleId: id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalAssigned = assignments.length;
    const completionRate =
      totalAssigned > 0
        ? Math.round(
          (assignments.filter((a) => a.status === 'COMPLETED').length /
            totalAssigned) *
          100
        )
        : 0;
    const averageProgress =
      totalAssigned > 0
        ? Math.round(
          assignments.reduce((sum, a) => sum + a.overallProgress, 0) /
          totalAssigned
        )
        : 0;
    const studentsInProgress = assignments.filter(
      (a) => a.status === 'IN_PROGRESS'
    ).length;
    const studentsCompleted = assignments.filter(
      (a) => a.status === 'COMPLETED'
    ).length;
    const averageXp =
      totalAssigned > 0
        ? assignments.reduce((sum, a) => sum + a.totalXp, 0) / totalAssigned
        : 0;

    // Format student progress
    const studentProgress = assignments.map((assignment) => ({
      studentId: assignment.studentId,
      studentName: assignment.student?.name || 'Unknown',
      studentEmail: assignment.student?.email || '',
      assignedAt: assignment.createdAt,
      currentLesson: assignment.currentLesson,
      currentStep: assignment.currentStep,
      overallProgress: assignment.overallProgress,
      totalXp: assignment.totalXp,
      lives: assignment.lives,
      status: assignment.status,
      lastActiveAt: assignment.lastActiveAt,
    }));

    res.json({
      success: true,
      data: {
        module,
        statistics: {
          totalAssigned,
          completionRate,
          averageProgress,
          studentsInProgress,
          studentsCompleted,
          averageXp,
        },
        studentProgress: studentProgress.sort((a, b) => b.overallProgress - a.overallProgress),
      },
    });
  } catch (error) {
    console.error('Get module student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student progress',
    });
  }
};