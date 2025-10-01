import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create test users with consistent hash (cost 10 for faster testing)
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {
      password: hashedPassword,
      username: 'admin_test',
      isActive: true,
    },
    create: {
      email: 'admin@test.com',
      username: 'admin_test',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    },
  })

  // Create teacher/parent user
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@test.com' },
    update: {
      password: hashedPassword,
      username: 'teacher_test',
      isActive: true,
    },
    create: {
      email: 'teacher@test.com',
      username: 'teacher_test',
      password: hashedPassword,
      name: 'Teacher User',
      role: 'TEACHER',
      isActive: true,
    },
  })

  // Create parent user
  const parent = await prisma.user.upsert({
    where: { email: 'parent@test.com' },
    update: {
      password: hashedPassword,
      username: 'parent_test',
      isActive: true,
    },
    create: {
      email: 'parent@test.com',
      username: 'parent_test',
      password: hashedPassword,
      name: 'Parent User',
      role: 'PARENT',
      isActive: true,
    },
  })

  // Create student user
  const student = await prisma.user.upsert({
    where: { email: 'student@test.com' },
    update: {
      password: hashedPassword,
      username: 'student_test',
      isActive: true,
      parentId: parent.id,
      createdById: teacher.id,
    },
    create: {
      email: 'student@test.com',
      username: 'student_test',
      password: hashedPassword,
      name: 'Student User',
      role: 'STUDENT',
      parentId: parent.id,
      createdById: teacher.id, // Student created by teacher for auto-assignment
      isActive: true,
    },
  })

  console.log({ admin, teacher, parent, student })
  // Seed default subscription tiers
  const starter = await prisma.subscriptionTier.upsert({
    where: { id: 'starter-fixed-id' },
    update: {},
    create: {
      id: 'starter-fixed-id',
      name: 'Starter',
      description: '5 exams and 5 modules per month',
      priceCents: 500,
      currency: 'USD',
      interval: 'MONTH',
      examLimitPerPeriod: 5,
      studyModuleLimitPerPeriod: 5,
      maxAttemptsPerExam: 2,
      isActive: true
    }
  })

  // Assign starter tier to student for immediate access
  const now = new Date()
  const expires = new Date(now)
  expires.setMonth(expires.getMonth() + 1)
  await prisma.subscription.upsert({
    where: { id: 'student-starter-sub' },
    update: { expiresAt: expires },
    create: {
      id: 'student-starter-sub',
      userId: student.id,
      tierId: starter.id,
      expiresAt: expires,
      autoRenew: false
    }
  })
  console.log('Seed completed!')
  console.log('\nTest accounts created:')
  console.log('Admin: admin@test.com / password123')
  console.log('Teacher: teacher@test.com / password123')
  console.log('Parent: parent@test.com / password123')
  console.log('Student: student@test.com / password123')
  console.log('\nDefault Tier: Starter ($5/month) assigned to student@test.com')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })