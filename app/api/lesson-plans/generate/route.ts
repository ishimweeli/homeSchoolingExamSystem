import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiService } from '@/lib/ai-service';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const lessonPlanSchema = z.object({
  topic: z.string().min(3),
  subject: z.string(),
  gradeLevel: z.number().min(1).max(12),
  duration: z.enum(['30 minutes', '1 hour', '90 minutes', '2 hours', '1 day', '1 week', '2 weeks', '1 month']),
  learningObjectives: z.array(z.string()).optional(),
  includeAssessment: z.boolean().default(true),
  includeActivities: z.boolean().default(true),
  includeResources: z.boolean().default(true),
  teachingStyle: z.enum(['traditional', 'hands-on', 'project-based', 'discussion', 'mixed']).default('mixed')
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to generate lesson plans
    if (!['PARENT', 'TEACHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to generate lesson plans' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = lessonPlanSchema.parse(body);

    // Generate comprehensive lesson plan using AI
    const lessonPlan = await generateLessonPlan(validatedData);

    // Save lesson plan to database
    const savedPlan = await prisma.lessonPlan.create({
      data: {
        title: `${validatedData.subject}: ${validatedData.topic}`,
        topic: validatedData.topic,
        subject: validatedData.subject,
        gradeLevel: validatedData.gradeLevel,
        duration: validatedData.duration,
        content: lessonPlan,
        createdBy: session.user.id,
        isPublished: false
      }
    });

    // If assessment is included, automatically create exam
    let examId = null;
    if (validatedData.includeAssessment && lessonPlan.assessment) {
      try {
        examId = await createExamFromLessonPlan(lessonPlan, validatedData, session.user.id);
      } catch (error) {
        console.error('Failed to create exam from lesson plan:', error);
      }
    }

    return NextResponse.json({
      message: 'Lesson plan generated successfully',
      lessonPlan: {
        id: savedPlan.id,
        ...lessonPlan,
        examId
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data provided', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Lesson plan generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate lesson plan. Please try again.' },
      { status: 500 }
    );
  }
}

async function generateLessonPlan(params: any) {
  const prompt = `
Generate a comprehensive lesson plan for homeschool students:

LESSON DETAILS:
- Topic: ${params.topic}
- Subject: ${params.subject}
- Grade Level: ${params.gradeLevel}
- Duration: ${params.duration}
- Teaching Style: ${params.teachingStyle}

REQUIREMENTS:
- Age-appropriate content for grade ${params.gradeLevel}
- Clear learning objectives
- Structured lesson flow
- Multiple learning modalities
- Parent-friendly instructions
${params.includeActivities ? '- Hands-on activities and experiments' : ''}
${params.includeResources ? '- Resource list with free/low-cost materials' : ''}
${params.includeAssessment ? '- Assessment questions for understanding' : ''}

LESSON PLAN STRUCTURE:
1. Learning Objectives (3-5 clear, measurable goals)
2. Materials Needed (household/easily accessible items)
3. Lesson Introduction (hook to engage student)
4. Main Instruction (step-by-step teaching guide)
5. Activities (interactive, age-appropriate exercises)
6. Discussion Questions (critical thinking prompts)
7. Assessment (questions to check understanding)
8. Extension Activities (for advanced students)
9. Resources (books, websites, videos)
10. Parent Notes (tips for teaching this topic)

SPECIAL CONSIDERATIONS:
- Homeschool-friendly (single parent/teacher with 1-4 students)
- Minimal prep time required
- Adaptable for different learning styles
- Include safety notes where applicable
- Budget-conscious materials

Return a JSON object with this structure:
{
  "title": "lesson title",
  "learningObjectives": ["objective1", "objective2", ...],
  "materialsNeeded": ["material1", "material2", ...],
  "lessonIntroduction": "engaging hook text",
  "mainInstruction": {
    "steps": ["step1", "step2", ...],
    "teachingTips": ["tip1", "tip2", ...]
  },
  "activities": [
    {
      "name": "activity name",
      "duration": "time needed",
      "instructions": "detailed steps",
      "materials": ["item1", "item2"]
    }
  ],
  "discussionQuestions": ["question1", "question2", ...],
  "assessment": {
    "questions": ["q1", "q2", ...],
    "rubric": "grading guidelines"
  },
  "extensionActivities": ["advanced activity1", "advanced activity2", ...],
  "resources": {
    "books": ["book recommendations"],
    "websites": ["educational websites"],
    "videos": ["video suggestions"]
  },
  "parentNotes": {
    "teachingTips": ["tip for parents"],
    "commonMistakes": ["what to avoid"],
    "adaptations": ["how to modify for different ages"]
  },
  "duration": "${params.duration}",
  "safetyNotes": ["safety consideration1", "safety consideration2"]
}
`;

  try {
    const response = await aiService.generateLessonPlan(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error('AI lesson plan generation error:', error);
    throw new Error('Failed to generate lesson plan');
  }
}

async function createExamFromLessonPlan(lessonPlan: any, params: any, userId: string) {
  if (!lessonPlan.assessment?.questions || lessonPlan.assessment.questions.length === 0) {
    return null;
  }

  try {
    // Convert lesson plan assessment into exam format
    const examQuestions = lessonPlan.assessment.questions.map((question: string, index: number) => ({
      type: determineQuestionType(question),
      question: question,
      correctAnswer: generateExpectedAnswer(question, lessonPlan.topic),
      marks: 5,
      aiGenerated: true,
      difficulty: 'medium',
      topic: lessonPlan.topic,
      order: index
    }));

    const exam = await prisma.exam.create({
      data: {
        title: `${lessonPlan.title} - Assessment`,
        description: `Auto-generated assessment for lesson: ${lessonPlan.topic}`,
        subject: params.subject,
        gradeLevel: params.gradeLevel,
        duration: 30, // Default 30 minutes
        totalMarks: examQuestions.length * 5,
        aiGenerated: true,
        aiConfig: {
          lessonPlanGenerated: true,
          originalTopic: params.topic,
          basedOnLessonPlan: true
        },
        creatorId: userId,
        status: 'DRAFT',
        questions: {
          create: examQuestions
        }
      }
    });

    return exam.id;
  } catch (error) {
    console.error('Failed to create exam from lesson plan:', error);
    return null;
  }
}

function determineQuestionType(question: string): string {
  const lower = question.toLowerCase();
  if (lower.includes('true or false') || lower.includes('t/f')) return 'TRUE_FALSE';
  if (lower.includes('multiple choice') || lower.includes('choose') || lower.includes('select')) return 'MULTIPLE_CHOICE';
  if (lower.includes('explain') || lower.includes('describe') || lower.includes('discuss')) return 'LONG_ANSWER';
  return 'SHORT_ANSWER';
}

function generateExpectedAnswer(question: string, topic: string): string {
  // Simple expected answer generation - in a real app, you'd use AI for this too
  return `Expected answer related to ${topic}. Please provide detailed feedback based on student's understanding of the concept.`;
}

// Extend the Prisma schema to include lesson plans (you'll need to add this)
// We'll assume you have a LessonPlan model in your schema