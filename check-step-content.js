const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStepContent() {
  try {
    // Get the specific PRACTICE_HARD step
    const step = await prisma.studyStep.findFirst({
      where: {
        lesson: {
          moduleId: 'cmfgde73z0001qpei496b8pna',
          order: 1
        },
        type: 'PRACTICE_HARD'
      }
    });

    if (step) {
      console.log('Step found:', step.title);
      console.log('Step type:', step.type);
      console.log('Step order:', step.order);
      console.log('\nStep content:');
      console.log(JSON.stringify(step.content, null, 2));
    }

    // Also update the student's progress to be on this step for testing
    const assignment = await prisma.studyModuleAssignment.findFirst({
      where: {
        moduleId: 'cmfgde73z0001qpei496b8pna',
        studentId: 'cmeqs8hfy00049d9ez39zw3fk'
      }
    });

    if (assignment) {
      console.log('\nCurrent assignment progress:');
      console.log('  Current Step:', assignment.currentStep);

      // Update to step 5 (PRACTICE_HARD)
      await prisma.studyModuleAssignment.update({
        where: { id: assignment.id },
        data: {
          currentStep: 5,
          currentLesson: 1
        }
      });
      console.log('\n✅ Updated student progress to step 5 (PRACTICE_HARD)');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStepContent();