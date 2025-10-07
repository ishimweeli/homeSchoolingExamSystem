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

    // 🎯 CONSERVATIVE APPROACH: Single API call for maximum reliability
    // Max 10 lessons ensures consistent quality, no duplication, perfect progression
    // Split-merge disabled for 100% reliability
    const shouldSplit = false; // Always use single request for best quality
    
    let moduleData: any;

    if (shouldSplit) {
      // Split into two parts for 100% reliability
      const halfLessons = Math.ceil(validatedData.lessonCount / 2);
      
      console.log('📦 SPLITTING Complete Course into TWO parts for 100% reliability:');
      console.log('  - Part 1: Lessons 1-' + halfLessons);
      console.log('  - Part 2: Lessons ' + (halfLessons + 1) + '-' + validatedData.lessonCount);

      // ========== PART 1: Generate first half ==========
      const promptConfig1 = generateStudyModulePrompt({
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        topic: validatedData.topic,
        difficulty: validatedData.difficulty,
        lessonCount: halfLessons,
        includeGamification: validatedData.includeGamification,
        country: validatedData.country,
      });

      console.log('🚀 [PART 1] Sending AI request with:');
      console.log('  - Lessons:', halfLessons);
      console.log('  - Max Tokens:', promptConfig1.maxTokens);

      const completion1 = await aiClient.chat.completions.create({
        model: getAIModel(),
        messages: [
          {
            role: 'system',
            content: promptConfig1.systemMessage,
          },
          {
            role: 'user',
            content: promptConfig1.userPrompt,
          },
        ],
        temperature: promptConfig1.temperature,
        max_tokens: promptConfig1.maxTokens,
      });

      console.log('✅ [PART 1] Completed. Usage:', completion1.usage);

      const aiResponse1 = completion1.choices[0].message.content;
      if (!aiResponse1) throw new Error('Part 1: AI did not return any content');

      console.log('📝 [PART 1] Response length:', aiResponse1.length);

      let cleaned1 = aiResponse1.trim();
      if (cleaned1.startsWith('```')) {
        cleaned1 = cleaned1.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      
      // Fix malformed JSON using helper function
      console.log('🧹 [PART 1] Fixing malformed JSON...');
      cleaned1 = fixMalformedJSON(cleaned1);
      
      let part1Data;
      try {
        part1Data = JSON.parse(cleaned1);
      } catch (parseErr: any) {
        console.error('❌ [PART 1] JSON parse failed:', parseErr.message);
        console.error('Error at position:', parseErr.message.match(/position (\d+)/)?.[1]);
        console.error('First 500 chars:', cleaned1.substring(0, 500));
        console.error('Last 500 chars:', cleaned1.substring(cleaned1.length - 500));
        throw new Error('Part 1: AI response is not valid JSON. Please try again.');
      }
      
      console.log('✅ [PART 1] JSON parsed successfully, lessons:', part1Data.lessons?.length);

      // ========== PART 2: Generate second half (CONTINUATION) ==========
      const remainingLessons = validatedData.lessonCount - halfLessons;
      
      // Extract lesson titles from Part 1 to avoid duplication
      const part1Topics = part1Data.lessons.map((l: any) => l.title).join(', ');
      
      console.log('📋 Part 1 covered topics:', part1Topics);
      
      const promptConfig2 = generateStudyModulePrompt({
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        topic: validatedData.topic,
        difficulty: validatedData.difficulty,
        lessonCount: remainingLessons,
        includeGamification: validatedData.includeGamification,
        country: validatedData.country,
        isPart2: true, // NEW FLAG
        part1Topics: part1Topics, // Pass covered topics
      });

      console.log('🚀 [PART 2] Sending AI request with:');
      console.log('  - Lessons:', remainingLessons);
      console.log('  - Max Tokens:', promptConfig2.maxTokens);

      const completion2 = await aiClient.chat.completions.create({
        model: getAIModel(),
        messages: [
          {
            role: 'system',
            content: promptConfig2.systemMessage,
          },
          {
            role: 'user',
            content: promptConfig2.userPrompt,
          },
        ],
        temperature: promptConfig2.temperature,
        max_tokens: promptConfig2.maxTokens,
      });

      console.log('✅ [PART 2] Completed. Usage:', completion2.usage);

      const aiResponse2 = completion2.choices[0].message.content;
      if (!aiResponse2) throw new Error('Part 2: AI did not return any content');

      console.log('📝 [PART 2] Response length:', aiResponse2.length);

      let cleaned2 = aiResponse2.trim();
      if (cleaned2.startsWith('```')) {
        cleaned2 = cleaned2.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      
      // Fix malformed JSON using helper function
      console.log('🧹 [PART 2] Fixing malformed JSON...');
      cleaned2 = fixMalformedJSON(cleaned2);
      
      let part2Data;
      try {
        part2Data = JSON.parse(cleaned2);
      } catch (parseErr: any) {
        console.error('❌ [PART 2] JSON parse failed:', parseErr.message);
        console.error('Error at position:', parseErr.message.match(/position (\d+)/)?.[1]);
        console.error('First 500 chars:', cleaned2.substring(0, 500));
        console.error('Last 500 chars:', cleaned2.substring(cleaned2.length - 500));
        throw new Error('Part 2: AI response is not valid JSON. Please try again.');
      }
      
      console.log('✅ [PART 2] JSON parsed successfully, lessons:', part2Data.lessons?.length);

      // ========== MERGE: Combine both parts ==========
      console.log('🔗 Merging Part 1 (' + part1Data.lessons.length + ' lessons) + Part 2 (' + part2Data.lessons.length + ' lessons)');

      // Check for duplicate/similar lesson titles
      const part1Titles = part1Data.lessons.map((l: any) => l.title.toLowerCase());
      const duplicates: string[] = [];

      part2Data.lessons.forEach((lesson: any) => {
        const title = lesson.title.toLowerCase();
        const isDuplicate = part1Titles.some((p1Title: string) => {
          // Check for exact match or very similar titles (>70% similarity)
          if (title === p1Title) return true;
          const similarity = title.split(' ').filter((word: string) => p1Title.includes(word)).length / title.split(' ').length;
          return similarity > 0.7;
        });
        if (isDuplicate) {
          duplicates.push(lesson.title);
        }
      });

      if (duplicates.length > 0) {
        console.warn('⚠️ WARNING: Detected potential duplicate lessons in Part 2:', duplicates);
        console.warn('   Part 1 covered:', part1Topics);
        console.warn('   These Part 2 lessons may overlap - consider manual review');
      }

      // Renumber lessons in part 2
      part2Data.lessons.forEach((lesson: any, idx: number) => {
        lesson.lessonNumber = halfLessons + idx + 1;
      });

      moduleData = {
        title: part1Data.title || `${validatedData.subject} - ${validatedData.topic} (Complete Course)`,
        description: part1Data.description || part2Data.description,
        lessons: [...part1Data.lessons, ...part2Data.lessons],
        xpRewards: part1Data.xpRewards || part2Data.xpRewards,
        badges: [...(part1Data.badges || []), ...(part2Data.badges || [])].filter((v, i, a) => a.indexOf(v) === i),
        mergeWarnings: duplicates.length > 0 ? `Detected ${duplicates.length} potentially duplicate lessons. Manual review recommended.` : null,
      };

      console.log('✅ Merge complete! Total lessons:', moduleData.lessons.length);
      if (duplicates.length > 0) {
        console.log('⚠️ MERGE WARNING: Found potential duplicates - flagged for user review');
      }

    } else {
      // ========== SINGLE REQUEST: Normal flow ==========
      const promptConfig = generateStudyModulePrompt({
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        topic: validatedData.topic,
        difficulty: validatedData.difficulty,
        lessonCount: validatedData.lessonCount,
        includeGamification: validatedData.includeGamification,
        country: validatedData.country,
      });

      console.log('🚀 Sending AI request with:');
      console.log('  - Model:', getAIModel());
      console.log('  - Max Tokens:', promptConfig.maxTokens);
      console.log('  - Temperature:', promptConfig.temperature);
      console.log('  - System Message Length:', promptConfig.systemMessage.length);
      console.log('  - User Prompt Length:', promptConfig.userPrompt.length);
      console.log('  - Grade Level:', validatedData.gradeLevel, '(0 = Complete Course)');

      // Retry logic for handling incomplete responses
      let completion;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          completion = await aiClient.chat.completions.create(
            {
              model: getAIModel(),
              messages: [
                {
                  role: 'system',
                  content: promptConfig.systemMessage,
                },
                {
                  role: 'user',
                  content: promptConfig.userPrompt,
                },
              ],
              temperature: promptConfig.temperature,
              max_tokens: promptConfig.maxTokens,
            },
            {
              timeout: 120000, // 120 second timeout
            }
          );
          break; // Success - exit retry loop
        } catch (retryError: any) {
          retryCount++;
          console.error(`❌ Attempt ${retryCount}/${maxRetries + 1} failed:`, retryError.message);

          if (retryCount > maxRetries) {
            throw retryError; // Give up after max retries
          }

          // Wait before retrying (exponential backoff)
          const waitTime = 1000 * Math.pow(2, retryCount - 1);
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      if (!completion) {
        throw new Error('Failed to get completion after retries');
      }

      console.log('✅ AI request completed successfully');
      console.log('  - Usage:', completion.usage);

      const aiResponse = completion.choices[0].message.content;
      
      if (!aiResponse) {
        throw new Error('AI did not return any content');
      }

      console.log('📝 AI Response received');
      console.log('  - Length:', aiResponse.length, 'characters');
      console.log('  - First 200 chars:', aiResponse.substring(0, 200));
      console.log('  - Last 200 chars:', aiResponse.substring(aiResponse.length - 200));

      // Strip markdown code fences if present
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        console.log('✂️ Stripped markdown code fences');
      }

      // Fix malformed JSON using helper function
      console.log('🧹 Fixing malformed JSON...');
      cleanedResponse = fixMalformedJSON(cleanedResponse);

      // Check if JSON looks incomplete (missing closing braces)
      const openBraces = (cleanedResponse.match(/\{/g) || []).length;
      const closeBraces = (cleanedResponse.match(/\}/g) || []).length;
      const openBrackets = (cleanedResponse.match(/\[/g) || []).length;
      const closeBrackets = (cleanedResponse.match(/\]/g) || []).length;
      
      if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
        console.error('⚠️ JSON appears incomplete!');
        console.error(`  - Open braces: ${openBraces}, Close braces: ${closeBraces}`);
        console.error(`  - Open brackets: ${openBrackets}, Close brackets: ${closeBrackets}`);
        console.error(`  - Response length: ${cleanedResponse.length} chars`);
        console.error('Last 1000 chars:', cleanedResponse.substring(cleanedResponse.length - 1000));
        throw new Error('AI response was cut off mid-generation. Try reducing lesson count to 8 or fewer lessons.');
      }

      try {
        moduleData = JSON.parse(cleanedResponse);
        console.log('✅ JSON parsed successfully, lessons:', moduleData.lessons?.length);
      } catch (parseError: any) {
        console.error('❌ Failed to parse AI response:', parseError.message);
        console.error('Error at position:', parseError.message.match(/position (\d+)/)?.[1]);
        console.error('First 500 chars:', cleanedResponse.substring(0, 500));
        console.error('Last 500 chars:', cleanedResponse.substring(cleanedResponse.length - 500));
        throw new Error('AI response was not valid JSON. Please try again.');
      }
    }

    if (!moduleData.lessons || moduleData.lessons.length === 0) {
      throw new Error('AI did not generate any lessons. Please try again with different parameters.');
    }

    console.log(`✅ AI generated ${moduleData.lessons.length} lessons with steps`);

    // Normalize and enforce minimum quality/structure on AI output
    try {
      moduleData.lessons = moduleData.lessons.map((lesson: any, index: number) => {
        const safeLesson = lesson || {};
        safeLesson.title = safeLesson.title || `Lesson ${index + 1}`;
        safeLesson.content = safeLesson.content || {};
        const theoryText = typeof safeLesson.content.theory === 'string' && safeLesson.content.theory.trim().length > 0
          ? safeLesson.content.theory
          : `Introduction to ${validatedData.topic}`;

        // Ensure curriculum alignment field exists
        if (!Array.isArray(safeLesson.content.curriculumAlignment)) {
          safeLesson.content.curriculumAlignment = [
            {
              standardCode: `${validatedData.subject.toUpperCase()}.G${validatedData.gradeLevel}.${String(validatedData.topic).replace(/\s+/g, '').toUpperCase()}`,
              description: `Grade ${validatedData.gradeLevel} ${validatedData.subject}: Mastery of ${validatedData.topic}`,
            },
          ];
        }

        // Ensure steps array exists
        const originalSteps = Array.isArray(safeLesson.steps) ? safeLesson.steps : [];

        // Helper creators for default steps
        const makeMC = (q: string, options: string[], correctLetter: 'A'|'B'|'C'|'D', explanation: string) => ({
          type: 'PRACTICE_EASY',
          title: 'Multiple Choice',
          content: {
            type: 'multiple_choice',
            question: q,
            options: options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`),
            correctAnswer: correctLetter,
            explanation,
          },
        });

        const makeFillBlank = (q: string, answer: string, explanation: string) => ({
          type: 'PRACTICE_EASY',
          title: 'Fill in the Blank',
          content: {
            type: 'fill-in-the-blank',
            question: q,
            correctAnswer: answer,
            explanation,
          },
        });

        const makeTrueFalse = (q: string, answer: 'True'|'False', explanation: string) => ({
          type: 'PRACTICE_EASY',
          title: 'True or False',
          content: {
            type: 'true_false',
            question: q,
            correctAnswer: answer,
            explanation,
          },
        });

        const makeMatching = (pairs: {active: string; passive: string;}[], explanation: string) => ({
          type: 'PRACTICE_MEDIUM',
          title: 'Match Active to Passive',
          content: {
            type: 'matching',
            question: 'Match each active sentence to its passive form',
            pairs,
            explanation,
          },
        });

        const steps: any[] = [...originalSteps];

        // Determine present exercise types
        const hasMC = steps.some(s => (s?.content?.type || '').includes('multiple_choice'));
        const hasFill = steps.some(s => ['fill-in-the-blank','fill_in_blank','text_entry'].includes(String(s?.content?.type)));
        const hasTF = steps.some(s => String(s?.content?.type) === 'true_false');
        const hasMatching = steps.some(s => String(s?.content?.type) === 'matching');

        // Add missing core exercise types
        if (!hasMC) {
          steps.push(
            makeMC(
              `Which sentence best demonstrates the concept in this lesson about ${validatedData.topic}?`,
              [
                `A common statement unrelated to ${validatedData.topic}`,
                `A statement demonstrating ${validatedData.topic}`,
                `An off-topic sentence`,
                `A vague statement`,
              ],
              'B',
              `Option B directly applies ${validatedData.topic}.`
            )
          );
        }

        if (!hasFill) {
          steps.push(
            makeFillBlank(
              `Complete correctly related to ${validatedData.topic}: "The report ___ (complete) yesterday."`,
              'was completed',
              'Use appropriate tense and structure.'
            )
          );
        }

        if (!hasTF) {
          steps.push(
            makeTrueFalse(
              `This sentence correctly applies ${validatedData.topic}: "The project was finished on time."`,
              'True',
              'It emphasizes the result rather than the doer.'
            )
          );
        }

        if (!hasMatching) {
          steps.push(
            makeMatching(
              [
                { active: 'The team won the match.', passive: 'The match was won by the team.' },
                { active: 'They will announce the winner.', passive: 'The winner will be announced.' },
              ],
              'Match each active sentence with its passive transformation.'
            )
          );
        }

        // Ensure at least 5 steps total (pad with a short review if needed)
        while (steps.length < 5) {
          steps.push(
            makeFillBlank(
              `Write one short sentence applying ${validatedData.topic}.`,
              `${validatedData.topic} applied`,
              'Any correct application demonstrating understanding is acceptable.'
            )
          );
        }

        // Return normalized lesson
        return {
          ...safeLesson,
          steps,
        };
      });
    } catch (normErr) {
      console.warn('⚠️ Failed to fully normalize AI module; proceeding with raw output.', normErr);
    }

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

    // Increment tier usage
    await incrementTierUsage((req as any).user.id, 'CREATE_STUDY_MODULE');

    console.log(`🎉 Study module created successfully: ${studyModule.title}`);
    console.log(`📊 Contains ${studyModule.lessons.length} lessons with ${studyModule.lessons.reduce((sum, l) => sum + l.steps.length, 0)} total steps`);

    res.status(201).json({
      success: true,
      data: studyModule,
      message: `Study module created with ${studyModule.lessons.length} lessons`,
    });
  } catch (error) {
    console.error('❌ Generate study module error:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('  - Error message:', error.message);
      console.error('  - Error type:', (error as any).type);
      console.error('  - Error name:', error.name);
      console.error('  - Error stack:', error.stack);
    }
    
    // Check if it's a timeout or token limit issue
    const errorMessage = error instanceof Error ? error.message : '';
    
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return res.status(500).json({
        success: false,
        message: 'AI request timed out. Try reducing the number of lessons or complexity.',
        error: 'REQUEST_TIMEOUT'
      });
    }
    
    if (errorMessage.includes('max_tokens') || errorMessage.includes('token limit')) {
      return res.status(500).json({
        success: false,
        message: 'Token limit exceeded. Try reducing the number of lessons.',
        error: 'TOKEN_LIMIT_EXCEEDED'
      });
    }

    if (errorMessage.includes('invalid json') || errorMessage.includes('Unexpected end of JSON')) {
      return res.status(500).json({
        success: false,
        message: 'AI response was incomplete or cut off. The response size may be too large. Try: 1) Reduce lesson count to 5-8, or 2) Use a simpler topic, or 3) Try again (sometimes it works on retry).',
        error: 'INCOMPLETE_AI_RESPONSE'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate study module',
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