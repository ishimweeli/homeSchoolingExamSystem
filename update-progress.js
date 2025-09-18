const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateStudentProgress() {
  try {
    // Update the assignment to show some progress
    const assignment = await prisma.studyModuleAssignment.findFirst({
      where: {
        moduleId: 'cmfgde73z0001qpei496b8pna',
        studentId: 'cmeqs8hfy00049d9ez39zw3fk' // Student User
      }
    });

    if (assignment) {
      // Update to lesson 2, step 3 (about 30% progress)
      await prisma.studyModuleAssignment.update({
        where: { id: assignment.id },
        data: {
          currentLesson: 2,
          currentStep: 3,
          totalXp: 150,
          overallProgress: 30,
          streak: 2,
          lastActiveAt: new Date()
        }
      });

      console.log('✅ Updated student progress to 30%');
    }

    // Check the update
    const updated = await prisma.studyModuleAssignment.findFirst({
      where: { id: assignment.id },
      include: {
        student: true,
        module: true
      }
    });

    console.log('\nUpdated assignment:');
    console.log(`  Student: ${updated.student.name}`);
    console.log(`  Module: ${updated.module.title}`);
    console.log(`  Progress: ${updated.overallProgress}%`);
    console.log(`  Current: Lesson ${updated.currentLesson}, Step ${updated.currentStep}`);
    console.log(`  Total XP: ${updated.totalXp}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStudentProgress();