import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    include: { tier: true }
  });

  if (!sub) return NextResponse.json({ active: false });

  return NextResponse.json({
    active: true,
    subscription: {
      id: sub.id,
      expiresAt: sub.expiresAt,
      lastResetAt: sub.lastResetAt,
      tier: sub.tier
    }
  });
}


