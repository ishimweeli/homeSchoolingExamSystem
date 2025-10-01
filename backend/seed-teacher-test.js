const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedTestTeacher() {
  try {
    console.log('🌱 Creating teacher@test.com user...\n');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create or update the teacher
    const teacher = await prisma.user.upsert({
      where: { email: 'teacher@test.com' },
      update: {},
      create: {
        email: 'teacher@test.com',
        username: 'teacher_test',
        password: hashedPassword,
        role: 'TEACHER',
        name: 'Test Teacher',
        emailVerified: new Date(),
      },
    });

    console.log('✅ Created teacher:', teacher.email);
    console.log('\nLogin credentials:');
    console.log('Email: teacher@test.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Error creating teacher:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestTeacher();