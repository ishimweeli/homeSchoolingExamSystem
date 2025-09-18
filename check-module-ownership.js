const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModuleOwnership() {
  try {
    // Get the teacher
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@test.com' }
    });
    console.log('Teacher:', teacher.id, teacher.name);

    // Get the module
    const module = await prisma.studyModule.findUnique({
      where: { id: 'cmfgde73z0001qpei496b8pna' }
    });

    if (module) {
      console.log('\nModule found:');
      console.log('- ID:', module.id);
      console.log('- Title:', module.title);
      console.log('- Created by:', module.createdBy);
      console.log('- Teacher owns it?', module.createdBy === teacher.id);

      // Update module to be owned by teacher if not
      if (module.createdBy !== teacher.id) {
        console.log('\nUpdating module to be owned by teacher...');
        await prisma.studyModule.update({
          where: { id: module.id },
          data: { createdBy: teacher.id }
        });
        console.log('✓ Module updated');
      }
    } else {
      console.log('Module not found, creating one...');
      const newModule = await prisma.studyModule.create({
        data: {
          title: 'Test Math Module',
          description: 'A test module for math',
          subject: 'Mathematics',
          gradeLevel: 5,
          difficulty: 'BEGINNER',
          createdBy: teacher.id,
          totalLessons: 5,
          estimatedHours: 2,
          isPublished: true
        }
      });
      console.log('✓ Created module:', newModule.id);
    }

    // Check students
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' }
    });
    console.log(`\n✓ Found ${students.length} students`);
    students.forEach(s => console.log(`  - ${s.name} (${s.email || s.username})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModuleOwnership();