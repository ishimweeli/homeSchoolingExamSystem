import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addMonths, addYears } from 'date-fns';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, email, tierId, months = 1 } = await req.json();
  let resolvedUserId = userId as string | undefined;
  if (!resolvedUserId && email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    resolvedUserId = user.id;
  }
  if (!resolvedUserId) return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });

  const tier = await prisma.subscriptionTier.findUnique({ where: { id: tierId } });
  if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 });

  const now = new Date();
  const expiresAt = tier.interval === 'MONTH' ? addMonths(now, months) : addYears(now, 1);

  const sub = await prisma.subscription.create({
    data: {
      userId: resolvedUserId,
      tierId,
      expiresAt,
      autoRenew: false,
      lastResetAt: now
    }
  });

  return NextResponse.json({ subscription: sub });
}


