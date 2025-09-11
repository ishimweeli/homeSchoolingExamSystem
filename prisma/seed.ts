import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 12)

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    },
  })

  // Create teacher/parent user
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@test.com' },
    update: {},
    create: {
      email: 'teacher@test.com',
      password: hashedPassword,
      name: 'Teacher User',
      role: 'TEACHER',
      isActive: true,
    },
  })

  // Create parent user
  const parent = await prisma.user.upsert({
    where: { email: 'parent@test.com' },
    update: {},
    create: {
      email: 'parent@test.com',
      password: hashedPassword,
      name: 'Parent User',
      role: 'PARENT',
      isActive: true,
    },
  })

  // Create student user
  const student = await prisma.user.upsert({
    where: { email: 'student@test.com' },
    update: {},
    create: {
      email: 'student@test.com',
      password: hashedPassword,
      name: 'Student User',
      role: 'STUDENT',
      parentId: parent.id,
      isActive: true,
    },
  })

  console.log({ admin, teacher, parent, student })
  console.log('Seed completed!')
  console.log('\nTest accounts created:')
  console.log('Admin: admin@test.com / password123')
  console.log('Teacher: teacher@test.com / password123')
  console.log('Parent: parent@test.com / password123')
  console.log('Student: student@test.com / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })