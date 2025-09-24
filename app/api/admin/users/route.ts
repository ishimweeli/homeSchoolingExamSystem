import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  // Attach active subscription info
  const usersWithSubs = await Promise.all(users.map(async (u) => {
    const sub = await prisma.subscription.findFirst({
      where: { userId: u.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: { tier: true }
    });
    return { ...u, subscription: sub ? { id: sub.id, tier: sub.tier.name, expiresAt: sub.expiresAt } : null };
  }));

  return NextResponse.json({ users: usersWithSubs });
}


