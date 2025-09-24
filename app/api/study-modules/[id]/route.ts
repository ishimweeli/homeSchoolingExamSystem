import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const module = await prisma.studyModule.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lessons: {
          include: {
            steps: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Check if user has access to this module
    // Students can only access assigned modules
    if (session.user.role === 'STUDENT') {
      const assignment = await prisma.studyModuleAssignment.findFirst({
        where: {
          moduleId: module.id,
          studentId: session.user.id
        }
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Check subscription gating for students
    if (session.user.role === 'STUDENT') {
      // Find active subscription
      const sub = await prisma.subscription.findFirst({
        where: {
          userId: session.user.id,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() }
        },
        include: { tier: true }
      });

      if (!sub) {
        return NextResponse.json({ error: 'Subscription required' }, { status: 402 });
      }

      // Track module access in current period if limit set
      if (sub.tier.studyModuleLimitPerPeriod > 0) {
        // Check if this module already counted this period
        const already = await prisma.subscriptionModuleAccess.findFirst({
          where: { subscriptionId: sub.id, moduleId: module.id }
        });
        if (!already) {
          // If limit reached, block
          const count = await prisma.subscriptionModuleAccess.count({
            where: { subscriptionId: sub.id }
          });
          if (count >= sub.tier.studyModuleLimitPerPeriod) {
            return NextResponse.json({ error: 'Module access limit reached for this period' }, { status: 402 });
          }
          await prisma.subscriptionModuleAccess.create({
            data: { subscriptionId: sub.id, moduleId: module.id }
          });
        }
      }
    }

    return NextResponse.json({ module });

  } catch (error) {
    console.error('Error fetching module:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module' },
      { status: 500 }
    );
  }
}