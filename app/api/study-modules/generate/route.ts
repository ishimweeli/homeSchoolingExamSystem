import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = 3;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only teachers and parents can create study modules
    if (!['TEACHER', 'PARENT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      title, 
      topic, 
      subject, 
      gradeLevel, 
      notes, // Optional notes from teacher/parent
      numberOfLessons = 10,
      country = 'US' // For curriculum standards
    } = body;

    // Validate inputs
    if (!topic || topic.trim().length < 2) {
      return NextResponse.json({ error: 'Topic must be at least 2 characters' }, { status: 400 });
    }

    if (numberOfLessons < 1 || numberOfLessons > 25) {
      return NextResponse.json({ error: 'Number of lessons must be between 1 and 25' }, { status: 400 });
    }

    console.log(`🚀 Starting AI generation for "${topic}" (${numberOfLessons} lessons, Grade ${gradeLevel})`);

    // Generate comprehensive study module with AI
    const prompt = `
      Create an interactive, Duolingo-style learning module for:
      
      Topic: ${topic}
      Subject: ${subject}
      Grade Level: ${gradeLevel}
      Number of Lessons: ${numberOfLessons}
      Country Standards: ${country} curriculum standards
      ${notes ? `Additional Notes/Requirements: ${notes}` : ''}
      
      Generate a complete learning path with ${numberOfLessons} progressive lessons.
      Each lesson should have 5 steps following this pattern:
      1. Theory/Introduction (with clear explanations and examples)
      2. Easy Practice (5 multiple choice questions, 80% pass required)
      3. Medium Practice (5 fill-in-the-blank questions, 85% pass required)  
      4. Hard Challenge (5 mixed questions, 95% pass required)
      5. Review (quick recap with 3 questions)
      
      Make it engaging for ${gradeLevel}th grade students with:
      - Clear, age-appropriate language
      - Fun examples and scenarios
      - Progressive difficulty
      - Immediate feedback explanations
      - Encouragement messages
      
      Return as JSON with this structure:
      {
        "module": {
          "title": "Module title",
          "description": "Brief description",
          "learningObjectives": ["objective1", "objective2"],
          "lessons": [
            {
              "lessonNumber": 1,
              "title": "Lesson title",
              "objective": "What student will learn",
              "steps": [
                {
                  "stepNumber": 1,
                  "type": "THEORY",
                  "title": "Introduction to...",
                  "content": {
                    "explanation": "Clear explanation...",
                    "examples": ["example1", "example2"],
                    "keyPoints": ["point1", "point2"],
                    "visualAids": "Description of visual elements"
                  }
                },
                {
                  "stepNumber": 2,
                  "type": "PRACTICE_EASY",
                  "title": "Let's Practice!",
                  "content": {
                    "instructions": "Choose the correct answer",
                    "questions": [
                      {
                        "question": "Question text",
                        "type": "multipleChoice",
                        "options": ["A", "B", "C", "D"],
                        "correctAnswer": "B",
                        "explanation": "Why this is correct",
                        "encouragement": "Great job!" 
                      }
                    ]
                  }
                },
                {
                  "stepNumber": 3,
                  "type": "PRACTICE_MEDIUM",
                  "title": "Fill in the Blanks",
                  "content": {
                    "instructions": "Complete the sentences",
                    "questions": [
                      {
                        "question": "The cat _____ on the mat",
                        "type": "fillBlank",
                        "correctAnswer": "sits",
                        "acceptableAnswers": ["sits", "is sitting"],
                        "hint": "Present tense of 'sit'",
                        "explanation": "We use 'sits' for singular subjects"
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    `;

    // AI Generation with retry logic
    let generatedContent;
    let aiSuccess = false;
    
    while (attempts < maxAttempts && !aiSuccess) {
      attempts++;
      console.log(`🤖 AI Generation attempt ${attempts}/${maxAttempts}`);
      
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational content creator specializing in creating engaging, interactive learning materials for children. Follow curriculum standards and pedagogical best practices. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          timeout: 90000, // 90 second timeout per attempt
          response_format: { type: 'json_object' }
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content generated');

        generatedContent = JSON.parse(content);
        
        // Validate that we got a proper structure
        if (!generatedContent.module || !generatedContent.module.lessons || generatedContent.module.lessons.length === 0) {
          throw new Error('Invalid module structure generated');
        }
        
        aiSuccess = true;
        console.log(`✅ AI generation successful on attempt ${attempts} (${Date.now() - startTime}ms)`);
        
      } catch (error) {
        console.error(`❌ AI generation attempt ${attempts} failed:`, error);
        if (attempts >= maxAttempts) {
          console.log('💡 Falling back to template generation');
          break;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempts * 2000));
      }
    }

    // If AI failed, use enhanced template
    if (!aiSuccess) {
      console.log('🔧 Creating enhanced template module');
      generatedContent = {
        module: {
          title: title || `${topic} Learning Journey`,
          description: `Interactive study module for ${topic}`,
          learningObjectives: [
            `Understand core concepts of ${topic}`,
            `Apply knowledge through practice`,
            `Master ${topic} skills through repetition`
          ],
          lessons: Array.from({ length: numberOfLessons }, (_, i) => ({
            lessonNumber: i + 1,
            title: `${topic} - Lesson ${i + 1}`,
            objective: `Learn key concepts in ${topic}`,
            steps: [
              {
                stepNumber: 1,
                type: 'THEORY',
                title: 'Introduction',
                content: {
                  explanation: `Let's learn about ${topic}. This lesson will cover important concepts you need to know.`,
                  examples: [`Example: ${topic} is used in many real-world situations.`],
                  keyPoints: [`Understanding ${topic} is important`, 'Practice makes perfect'],
                  visualAids: 'Interactive diagrams and examples'
                }
              },
              {
                stepNumber: 2,
                type: 'PRACTICE_EASY',
                title: 'Easy Practice',
                content: {
                  instructions: 'Choose the correct answer',
                  questions: [
                    {
                      question: `What is the main concept of ${topic}?`,
                      type: 'multipleChoice',
                      options: ['Option A', 'Option B', 'Option C', 'Option D'],
                      correctAnswer: 'Option A',
                      explanation: 'This is the correct concept',
                      encouragement: 'Great work!'
                    }
                  ]
                }
              }
            ]
          }))
        }
      };
    }
    
    console.log(`📦 Creating module in database: "${generatedContent.module.title}"`);
    
    // Create the study module in database
    const studyModule = await prisma.studyModule.create({
      data: {
        title: generatedContent.module.title || title,
        description: generatedContent.module.description,
        topic,
        subject,
        gradeLevel,
        aiGenerated: true,
        totalLessons: numberOfLessons,
        passingScore: 95,
        livesEnabled: true,
        maxLives: 3,
        xpReward: 100 * numberOfLessons,
        badgeType: 'MASTERY',
        createdBy: session.user.id,
        lessons: {
          create: generatedContent.module.lessons.map((lesson: any, idx: number) => ({
            lessonNumber: lesson.lessonNumber,
            title: lesson.title,
            content: {
              objective: lesson.objective,
              learningObjectives: generatedContent.module.learningObjectives
            },
            minScore: 80,
            maxAttempts: 3,
            xpReward: 50,
            order: idx,
            steps: {
              create: lesson.steps.map((step: any, stepIdx: number) => ({
                stepNumber: step.stepNumber,
                type: step.type,
                title: step.title,
                content: step.content,
                passingScore: 
                  step.type === 'PRACTICE_EASY' ? 80 :
                  step.type === 'PRACTICE_MEDIUM' ? 85 :
                  step.type === 'PRACTICE_HARD' ? 95 : 70,
                order: stepIdx
              }))
            }
          }))
        }
      },
      include: {
        lessons: {
          include: {
            steps: true
          }
        }
      }
    });

    // AUTO-ASSIGN to all students created by this teacher
    console.log('🎯 Auto-assigning module to teacher\'s students...');
    const teacherStudents = await prisma.user.findMany({
      where: {
        createdById: session.user.id,
        role: 'STUDENT',
        isActive: true
      }
    });

    console.log(`Found ${teacherStudents.length} students for auto-assignment`);

    // Create assignments for all students
    if (teacherStudents.length > 0) {
      await prisma.studyModuleAssignment.createMany({
        data: teacherStudents.map(student => ({
          moduleId: studyModule.id,
          studentId: student.id,
          assignedBy: session.user.id,
          currentLesson: 1,
          currentStep: 1,
          overallProgress: 0,
          totalXp: 0,
          lives: 3,
          streak: 0,
          status: 'NOT_STARTED',
          averageScore: 0,
          totalAttempts: 0
        })),
        skipDuplicates: true
      });
      console.log(`✅ Auto-assigned module to ${teacherStudents.length} students`);
    }

    const finalTime = Date.now() - startTime;
    console.log(`🎉 Module creation completed in ${finalTime}ms (${attempts} AI attempts, ${aiSuccess ? 'AI' : 'Template'} generation)`);

    return NextResponse.json({
      success: true,
      moduleId: studyModule.id,
      module: studyModule,
      message: `Created interactive study module with ${numberOfLessons} lessons! Auto-assigned to ${teacherStudents.length} students.`,
      generationTime: finalTime,
      aiGenerated: aiSuccess,
      attempts: attempts,
      autoAssigned: teacherStudents.length
    });

  } catch (error) {
    console.error('Error generating study module:', error);
    
    // Fallback to template-based generation if AI fails
    try {
      const session = await getServerSession(authOptions);
      const body = await req.json();
      const { title, topic, subject, gradeLevel, numberOfLessons = 10 } = body;
      
      // Create a basic template-based module
      const studyModule = await prisma.studyModule.create({
        data: {
          title: title || `${topic} Study Module`,
          description: `Interactive lessons for ${topic}`,
          topic,
          subject,
          gradeLevel,
          aiGenerated: false,
          totalLessons: numberOfLessons,
          createdBy: session!.user.id,
          lessons: {
            create: Array.from({ length: numberOfLessons }, (_, i) => ({
              lessonNumber: i + 1,
              title: `Lesson ${i + 1}: ${topic} Part ${i + 1}`,
              content: {
                objective: `Master concepts in ${topic} - Part ${i + 1}`
              },
              order: i,
              steps: {
                create: [
                  {
                    stepNumber: 1,
                    type: 'THEORY',
                    title: 'Introduction',
                    content: {
                      explanation: `Introduction to ${topic} concepts`,
                      examples: []
                    },
                    passingScore: 70,
                    order: 0
                  },
                  {
                    stepNumber: 2,
                    type: 'PRACTICE_EASY',
                    title: 'Easy Practice',
                    content: {
                      instructions: 'Complete the following questions',
                      questions: []
                    },
                    passingScore: 80,
                    order: 1
                  },
                  {
                    stepNumber: 3,
                    type: 'PRACTICE_MEDIUM',
                    title: 'Medium Practice',
                    content: {
                      instructions: 'Test your understanding',
                      questions: []
                    },
                    passingScore: 85,
                    order: 2
                  }
                ]
              }
            }))
          }
        },
        include: {
          lessons: {
            include: {
              steps: true
            }
          }
        }
      });
      
      // AUTO-ASSIGN to students for fallback template too
      console.log('🎯 Auto-assigning template module to teacher\'s students...');
      const teacherStudents = await prisma.user.findMany({
        where: {
          createdById: session!.user.id,
          role: 'STUDENT',
          isActive: true
        }
      });

      if (teacherStudents.length > 0) {
        await prisma.studyModuleAssignment.createMany({
          data: teacherStudents.map(student => ({
            moduleId: studyModule.id,
            studentId: student.id,
            assignedBy: session!.user.id,
            currentLesson: 1,
            currentStep: 1,
            overallProgress: 0,
            totalXp: 0,
            lives: 3,
            streak: 0,
            status: 'NOT_STARTED',
            averageScore: 0,
            totalAttempts: 0
          })),
          skipDuplicates: true
        });
        console.log(`✅ Auto-assigned template module to ${teacherStudents.length} students`);
      }
      
      return NextResponse.json({
        success: true,
        moduleId: studyModule.id,
        module: studyModule,
        message: `Created study module template. Auto-assigned to ${teacherStudents.length} students.`,
        isTemplate: true,
        autoAssigned: teacherStudents.length
      });
      
    } catch (fallbackError) {
      console.error('Fallback generation also failed:', fallbackError);
      return NextResponse.json(
        { error: 'Failed to generate study module' },
        { status: 500 }
      );
    }
  }
}