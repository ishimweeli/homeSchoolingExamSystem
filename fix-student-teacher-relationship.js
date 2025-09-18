const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixStudentTeacherRelationship() {
  console.log('🔧 Fixing student-teacher relationship...');
  
  try {
    // Get teacher and student IDs
    const teacher = await prisma.user.findFirst({
      where: { email: 'teacher@test.com' }
    });
    
    const student = await prisma.user.findFirst({
      where: { email: 'student@test.com' }
    });
    
    if (!teacher || !student) {
      console.error('❌ Teacher or student not found');
      return;
    }
    
    console.log(`Teacher ID: ${teacher.id}`);
    console.log(`Student ID: ${student.id}`);
    
    // Update student to be created by teacher
    const updatedStudent = await prisma.user.update({
      where: { id: student.id },
      data: { createdById: teacher.id }
    });
    
    console.log('✅ Student-teacher relationship fixed:');
    console.log(`Student ${updatedStudent.email} now belongs to teacher ${teacher.email}`);
    
    // Verify the relationship
    const studentsOfTeacher = await prisma.user.findMany({
      where: {
        createdById: teacher.id,
        role: 'STUDENT'
      }
    });
    
    console.log(`🎯 Teacher now has ${studentsOfTeacher.length} students:`);
    studentsOfTeacher.forEach(s => console.log(`  - ${s.email} (${s.name})`));
    
  } catch (error) {
    console.error('❌ Error fixing relationship:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStudentTeacherRelationship();