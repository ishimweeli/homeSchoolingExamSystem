import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const examId = params.id
    const body = await request.json()

    // Check if exam exists
    const exam = await prisma.exam.findUnique({
      where: { id: examId }
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // For now, allow assigning draft exams too since we're in development
    // if (exam.status !== 'ACTIVE') {
    //   return NextResponse.json({ error: 'Only published exams can be assigned' }, { status: 400 })
    // }

    if (exam.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to assign this exam' }, { status: 403 })
    }

    const { assignments } = body

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: 'No assignments provided' }, { status: 400 })
    }

    const createdAssignments = []

    for (const assignment of assignments) {
      const {
        studentId,
        classId,
        dueDate,
        startDate,
        allowLateSubmission = false,
        maxAttempts = 1
      } = assignment

      if (studentId) {
        // Individual student assignment
        const student = await prisma.user.findUnique({
          where: { id: studentId, role: 'STUDENT' }
        })

        if (!student) {
          console.warn(`Student ${studentId} not found`)
          continue
        }

        // Check if assignment already exists
        const existingAssignment = await prisma.examAssignment.findFirst({
          where: { 
            examId,
            studentId,
            isActive: true
          }
        })

        if (existingAssignment) {
          console.warn(`Assignment already exists for student ${studentId} and exam ${examId}`)
          continue
        }

        const created = await prisma.examAssignment.create({
          data: {
            examId,
            studentId,
            assignedBy: session.user.id,
            dueDate: dueDate ? new Date(dueDate) : null,
            startDate: startDate ? new Date(startDate) : null,
            allowLateSubmission,
            maxAttempts
          },
          include: {
            student: {
              select: { 
                firstName: true,
                lastName: true,
                name: true, 
                email: true,
                username: true 
              }
            }
          }
        })
        createdAssignments.push(created)

      } else if (classId) {
        // Class assignment
        const classData = await prisma.class.findUnique({
          where: { id: classId },
          include: {
            students: {
              include: {
                student: true
              }
            }
          }
        })

        if (!classData) {
          console.warn(`Class ${classId} not found`)
          continue
        }

        // Create assignment for the class
        const created = await prisma.examAssignment.create({
          data: {
            examId,
            classId,
            assignedBy: session.user.id,
            dueDate: dueDate ? new Date(dueDate) : null,
            startDate: startDate ? new Date(startDate) : null,
            allowLateSubmission,
            maxAttempts
          },
          include: {
            class: {
              select: { 
                name: true,
                gradeLevel: true,
                students: {
                  include: {
                    student: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        name: true,
                        username: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        })
        createdAssignments.push(created)

        // Also create individual assignments for each student in the class
        for (const classStudent of classData.students) {
          // Check if assignment already exists for this student
          const existingAssignment = await prisma.examAssignment.findFirst({
            where: { 
              examId,
              studentId: classStudent.studentId,
              isActive: true
            }
          })

          if (existingAssignment) {
            console.warn(`Assignment already exists for student ${classStudent.studentId} and exam ${examId}`)
            continue
          }

          await prisma.examAssignment.create({
            data: {
              examId,
              studentId: classStudent.studentId,
              classId,
              assignedBy: session.user.id,
              dueDate: dueDate ? new Date(dueDate) : null,
              startDate: startDate ? new Date(startDate) : null,
              allowLateSubmission,
              maxAttempts
            }
          })
        }
      }
    }

    return NextResponse.json({ 
      message: `Exam assigned successfully`,
      assignments: createdAssignments
    })

  } catch (error) {
    console.error('Error assigning exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET assignments for an exam
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const examId = params.id

    const assignments = await prisma.examAssignment.findMany({
      where: { 
        examId,
        isActive: true
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedByUser: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(assignments)

  } catch (error) {
    console.error('Error fetching exam assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}