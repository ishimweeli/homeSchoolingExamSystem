const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    // Check all students
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        teacherId: true
      }
    });

    console.log('Current Students:', students);
    console.log('Total students found:', students.length);

    // Check all teachers
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        email: true,
        name: true,
        students: {
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log('\nTeachers with their students:');
    teachers.forEach(teacher => {
      console.log(`\nTeacher: ${teacher.email} (${teacher.name})`);
      console.log(`  Students: ${teacher.students.length}`);
      teacher.students.forEach(student => {
        console.log(`    - ${student.email} (${student.firstName} ${student.lastName})`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();