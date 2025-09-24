import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const FLW_PK = process.env.FLW_PUBLIC_KEY || '';
const FLW_SK = process.env.FLW_SECRET_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tierId } = await req.json();
  const tier = await prisma.subscriptionTier.findUnique({ where: { id: tierId } });
  if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 });

  const txRef = `hs_${session.user.id}_${Date.now()}`;

  // Create pending payment record
  await prisma.payment.create({
    data: {
      userId: session.user.id,
      amountCents: tier.priceCents,
      currency: tier.currency,
      txRef,
      metadata: { tierId }
    }
  });

  const payload = {
    tx_ref: txRef,
    amount: (tier.priceCents / 100).toFixed(2),
    currency: tier.currency,
    redirect_url: `${BASE_URL}/payments/flutterwave/callback`,
    customer: {
      email: session.user.email,
      name: session.user.name || 'User'
    },
    meta: { tierId }
  };

  // We don't call Flutterwave directly here to avoid exposing keys in serverless preview.
  // Instead, the client can use the tx_ref with Flutterwave inline or we can implement server-side init later.
  return NextResponse.json({ txRef, publicKey: FLW_PK, payload });
}


