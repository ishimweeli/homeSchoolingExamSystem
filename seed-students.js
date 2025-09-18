const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedStudents() {
  console.log('Seeding students for teacher...');

  try {
    // Find the teacher
    const teacher = await prisma.user.findFirst({
      where: {
        email: 'teacher@example.com',
        role: 'TEACHER'
      }
    });

    if (!teacher) {
      console.error('Teacher not found! Please ensure teacher@example.com exists.');
      return;
    }

    console.log(`Found teacher: ${teacher.name} (${teacher.id})`);

    // Create multiple students
    const students = [
      {
        email: 'john.doe@student.com',
        username: 'john_doe',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        password: await bcrypt.hash('password123', 10),
        role: 'STUDENT',
        createdById: teacher.id,
        emailVerified: new Date(),
        gradeLevel: 9
      },
      {
        email: 'jane.smith@student.com',
        username: 'jane_smith',
        firstName: 'Jane',
        lastName: 'Smith',
        name: 'Jane Smith',
        password: await bcrypt.hash('password123', 10),
        role: 'STUDENT',
        createdById: teacher.id,
        emailVerified: new Date(),
        gradeLevel: 10
      },
      {
        email: 'bob.wilson@student.com',
        username: 'bob_wilson',
        firstName: 'Bob',
        lastName: 'Wilson',
        name: 'Bob Wilson',
        password: await bcrypt.hash('password123', 10),
        role: 'STUDENT',
        createdById: teacher.id,
        emailVerified: new Date(),
        gradeLevel: 9
      },
      {
        email: 'alice.johnson@student.com',
        username: 'alice_johnson',
        firstName: 'Alice',
        lastName: 'Johnson',
        name: 'Alice Johnson',
        password: await bcrypt.hash('password123', 10),
        role: 'STUDENT',
        createdById: teacher.id,
        emailVerified: new Date(),
        gradeLevel: 11
      }
    ];

    console.log('\nCreating students...');

    for (const studentData of students) {
      try {
        // Check if student already exists
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { email: studentData.email },
              { username: studentData.username }
            ]
          }
        });

        if (existing) {
          console.log(`⚠ Student ${studentData.name} already exists`);
        } else {
          const student = await prisma.user.create({
            data: studentData
          });
          console.log(`✓ Created student: ${student.name} (${student.email})`);
        }
      } catch (error) {
        console.error(`Error creating ${studentData.name}:`, error.message);
      }
    }

    // Verify students were created
    const allStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        createdById: teacher.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        gradeLevel: true
      }
    });

    console.log(`\n✅ Total students for teacher: ${allStudents.length}`);
    console.log('\nStudents list:');
    allStudents.forEach(s => {
      console.log(`  - ${s.name} (${s.username}) - Grade ${s.gradeLevel || 'N/A'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedStudents().catch(console.error);