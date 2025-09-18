const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModuleLessons() {
  try {
    // Get the module with its lessons
    const module = await prisma.studyModule.findUnique({
      where: { id: 'cmfgde73z0001qpei496b8pna' },
      include: {
        lessons: {
          include: {
            steps: true
          }
        }
      }
    });

    if (module) {
      console.log('Module:', module.title);
      console.log('Total lessons:', module.lessons.length);

      if (module.lessons.length === 0) {
        console.log('\n⚠️ No lessons found! Creating sample lessons...');

        // Create lessons for the module
        const lesson1 = await prisma.studyLesson.create({
          data: {
            moduleId: module.id,
            order: 1,
            title: 'Introduction to Addition',
            description: 'Learn the basics of adding numbers',
            xpReward: 30
          }
        });

        // Create steps for lesson 1
        await prisma.lessonStep.create({
          data: {
            lessonId: lesson1.id,
            order: 1,
            type: 'THEORY',
            title: 'What is Addition?',
            content: {
              explanation: 'Addition is putting numbers together to get a total.',
              examples: ['1 + 1 = 2', '2 + 3 = 5'],
              keyPoints: ['Addition makes numbers bigger', 'The + sign means add']
            },
            xpReward: 10
          }
        });

        await prisma.lessonStep.create({
          data: {
            lessonId: lesson1.id,
            order: 2,
            type: 'PRACTICE_EASY',
            title: 'Easy Practice',
            content: {
              questions: [
                {
                  question: '2 + 2 = ?',
                  type: 'fillBlank',
                  correctAnswer: '4',
                  acceptableAnswers: ['4', 'four'],
                  hint: 'Type the number',
                  explanation: '2 + 2 equals 4',
                  encouragement: 'Great job!'
                }
              ]
            },
            xpReward: 10
          }
        });

        await prisma.lessonStep.create({
          data: {
            lessonId: lesson1.id,
            order: 3,
            type: 'PRACTICE_HARD',
            title: 'Hard Challenge!',
            content: {
              questions: [
                {
                  question: '4 + 3 = ?',
                  type: 'fillBlank',
                  correctAnswer: '7',
                  acceptableAnswers: ['7', 'seven'],
                  hint: 'Type your answer',
                  explanation: '4 + 3 equals 7',
                  encouragement: 'Excellent work!'
                }
              ]
            },
            xpReward: 10
          }
        });

        console.log('✅ Created lesson with 3 steps');
      } else {
        console.log('\nLessons found:');
        module.lessons.forEach((lesson, idx) => {
          console.log(`\nLesson ${idx + 1}: ${lesson.title}`);
          console.log(`  Steps: ${lesson.steps.length}`);
          lesson.steps.forEach((step, sidx) => {
            console.log(`    Step ${sidx + 1}: ${step.type} - ${step.title}`);
            if (step.content && typeof step.content === 'object') {
              console.log(`      Content keys: ${Object.keys(step.content).join(', ')}`);
            }
          });
        });
      }

      // Check assignment progress
      const assignment = await prisma.studyModuleAssignment.findFirst({
        where: {
          moduleId: module.id,
          studentId: 'cmeqs8hfy00049d9ez39zw3fk' // Student User
        }
      });

      if (assignment) {
        console.log('\n📊 Assignment Progress:');
        console.log('  Current Lesson:', assignment.currentLesson);
        console.log('  Current Step:', assignment.currentStep);
        console.log('  Overall Progress:', assignment.overallProgress + '%');
        console.log('  Status:', assignment.status);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModuleLessons();