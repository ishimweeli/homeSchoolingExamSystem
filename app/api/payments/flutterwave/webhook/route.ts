import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// NOTE: Configure FLW webhook secret in env FLW_WEBHOOK_SECRET if needed. For now we accept verified events by tx_ref.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body?.event || body?.status;

    const data = body?.data || body;
    const txRef: string | undefined = data?.tx_ref || data?.txRef;
    const flwRef: string | undefined = data?.id?.toString() || data?.flw_ref;

    if (!txRef) return NextResponse.json({ ok: true });

    const payment = await prisma.payment.findUnique({ where: { txRef } });
    if (!payment) return NextResponse.json({ ok: true });

    const success = (data?.status === 'successful') || (event === 'charge.completed' && data?.status === 'successful');

    // Update payment
    await prisma.payment.update({
      where: { txRef },
      data: {
        status: success ? 'SUCCESS' : 'FAILED',
        flwRef,
        raw: body
      }
    });

    if (success) {
      const tierId = (payment.metadata as any)?.tierId as string | undefined;
      if (tierId) {
        // Create or extend subscription
        const tier = await prisma.subscriptionTier.findUnique({ where: { id: tierId } });
        if (tier) {
          const now = new Date();
          const expiresAt = new Date(now);
          if (tier.interval === 'MONTH') {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
          } else {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          }

          // If active subscription exists, extend expiry; else create new
          const existing = await prisma.subscription.findFirst({
            where: { userId: payment.userId, tierId, status: 'ACTIVE' },
            orderBy: { expiresAt: 'desc' }
          });

          if (existing && existing.expiresAt > now) {
            await prisma.subscription.update({
              where: { id: existing.id },
              data: { expiresAt }
            });
          } else {
            await prisma.subscription.create({
              data: {
                userId: payment.userId,
                tierId,
                expiresAt,
                autoRenew: true
              }
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('FLW webhook error', e);
    return NextResponse.json({ ok: true });
  }
}


