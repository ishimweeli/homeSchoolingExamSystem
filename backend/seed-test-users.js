const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedTestUsers() {
  console.log('🌱 Seeding test users...\n');

  try {
    // Create teacher
    const hashedPassword = await bcrypt.hash('password123', 10);

    const teacher = await prisma.user.upsert({
      where: { email: 'teacher@example.com' },
      update: {},
      create: {
        email: 'teacher@example.com',
        username: 'teacher1',
        password: hashedPassword,
        role: 'TEACHER',
        name: 'Test Teacher',
        emailVerified: new Date(),
      },
    });
    console.log('✅ Created teacher:', teacher.email);

    // Create parent
    const parent = await prisma.user.upsert({
      where: { email: 'parent@example.com' },
      update: {},
      create: {
        email: 'parent@example.com',
        username: 'parent1',
        password: hashedPassword,
        role: 'PARENT',
        name: 'Test Parent',
        emailVerified: new Date(),
      },
    });
    console.log('✅ Created parent:', parent.email);

    // Create student
    const student = await prisma.user.upsert({
      where: { email: 'student@example.com' },
      update: {},
      create: {
        email: 'student@example.com',
        username: 'student1',
        password: hashedPassword,
        role: 'STUDENT',
        name: 'Test Student',
        emailVerified: new Date(),
      },
    });
    console.log('✅ Created student:', student.email);

    console.log('\n🎉 Test users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Teacher: teacher@example.com / password123');
    console.log('Parent: parent@example.com / password123');
    console.log('Student: student@example.com / password123');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestUsers();