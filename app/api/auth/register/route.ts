import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6),
  role: z.enum(['PARENT', 'TEACHER', 'STUDENT']),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Check if user already exists with username
    const existingUserWithUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
    })

    if (existingUserWithUsername) {
      return NextResponse.json(
        { error: 'User with this username already exists' },
        { status: 400 }
      )
    }

    // Check if user already exists with email (if provided)
    if (validatedData.email) {
      const existingUserWithEmail = await prisma.user.findUnique({
        where: { email: validatedData.email },
      })

      if (existingUserWithEmail) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Split name into firstName and lastName if possible
    const nameParts = validatedData.name.split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || null

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        firstName,
        lastName,
        username: validatedData.username,
        email: validatedData.email || null,
        password: hashedPassword,
        role: validatedData.role,
        emailVerified: validatedData.role === 'STUDENT' ? new Date() : null, // Auto-verify students
      },
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'User created successfully',
      user: userWithoutPassword,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data provided', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}