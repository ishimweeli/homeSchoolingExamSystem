import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Flutterwave API Configuration
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
const FLUTTERWAVE_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5001';

/**
 * Initiate Flutterwave Payment
 */
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { tierId, redirectUrl } = req.body;

    if (!tierId) {
      return res.status(400).json({
        success: false,
        message: 'Tier ID is required'
      });
    }

    // Check if Flutterwave is configured
    if (!FLUTTERWAVE_SECRET_KEY || !FLUTTERWAVE_PUBLIC_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is not configured. Please contact administrator.'
      });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get tier details
    const tier = await prisma.tier.findUnique({
      where: { id: tierId }
    });

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: 'Tier not found'
      });
    }

    if (!tier.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This tier is not available'
      });
    }

    // Generate unique transaction reference
    const txRef = `TXN-${Date.now()}-${userId.substring(0, 8)}`;

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        userId,
        provider: 'FLUTTERWAVE',
        amountCents: Math.round(tier.price * 100), // Convert to cents
        currency: tier.currency || 'USD',
        status: 'PENDING',
        txRef,
        metadata: {
          tierId: tier.id,
          tierName: tier.name,
          validityDays: tier.validityDays
        }
      }
    });

    // Prepare Flutterwave payment request
    const paymentData = {
      tx_ref: txRef,
      amount: tier.price,
      currency: tier.currency || 'USD',
      redirect_url: redirectUrl || `${FRONTEND_URL}/subscription?payment=success`,
      customer: {
        email: user.email || `${user.id}@temp.com`,
        name: user.name || 'User',
      },
      customizations: {
        title: 'EduSystem Subscription',
        description: `${tier.name} Plan - ${tier.validityDays} days`,
        logo: `${FRONTEND_URL}/logo.png`
      },
      meta: {
        userId: user.id,
        tierId: tier.id,
        paymentId: payment.id
      }
    };

    // Call Flutterwave API
    const response = await axios.post(
      `${FLUTTERWAVE_BASE_URL}/payments`,
      paymentData,
      {
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      return res.status(200).json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          paymentUrl: response.data.data.link,
          txRef,
          paymentId: payment.id
        }
      });
    } else {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          raw: response.data
        }
      });

      return res.status(400).json({
        success: false,
        message: 'Failed to initiate payment',
        error: response.data.message
      });
    }
  } catch (error: any) {
    console.error('Payment initiation error:', error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to initiate payment'
    });
  }
};

/**
 * Verify Flutterwave Payment
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { transaction_id, tx_ref } = req.query;

    if (!transaction_id && !tx_ref) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID or reference is required'
      });
    }

    // Find payment record
    const payment = await prisma.payment.findUnique({
      where: { txRef: tx_ref as string },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // If already successful, return success
    if (payment.status === 'SUCCESS') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        data: {
          status: 'SUCCESS',
          txRef: payment.txRef
        }
      });
    }

    // Verify with Flutterwave
    const verifyUrl = transaction_id 
      ? `${FLUTTERWAVE_BASE_URL}/transactions/${transaction_id}/verify`
      : `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${tx_ref}`;

    const response = await axios.get(verifyUrl, {
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`
      }
    });

    const verificationData = response.data.data;

    if (response.data.status === 'success' && 
        verificationData.status === 'successful' && 
        verificationData.amount >= (payment.amountCents / 100) &&
        verificationData.currency === payment.currency) {
      
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          flwRef: verificationData.flw_ref || verificationData.id?.toString(),
          raw: verificationData
        }
      });

      // Assign tier to user
      const tierId = (payment.metadata as any)?.tierId;
      if (tierId) {
        const tier = await prisma.tier.findUnique({
          where: { id: tierId }
        });

        if (tier) {
          // Calculate expiry date
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + tier.validityDays);

          // Check if user already has a tier
          const existingUserTier = await prisma.userTier.findUnique({
            where: { userId: payment.userId }
          });

          if (existingUserTier) {
            // Update existing tier
            await prisma.userTier.update({
              where: { userId: payment.userId },
              data: {
                tierId: tier.id,
                expiresAt,
                isActive: true,
                // Reset usage counters on upgrade
                examsCreated: 0,
                studyModulesCreated: 0,
                studentsCreated: 0
              }
            });
          } else {
            // Create new tier assignment
            await prisma.userTier.create({
              data: {
                userId: payment.userId,
                tierId: tier.id,
                expiresAt,
                isActive: true,
                examsCreated: 0,
                studyModulesCreated: 0,
                studentsCreated: 0
              }
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          status: 'SUCCESS',
          txRef: payment.txRef,
          amount: payment.amountCents / 100,
          currency: payment.currency
        }
      });
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          raw: verificationData
        }
      });

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        data: {
          status: verificationData.status,
          txRef: payment.txRef
        }
      });
    }
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to verify payment'
    });
  }
};

/**
 * Flutterwave Webhook Handler
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const signature = req.headers['verif-hash'];
    
    if (!signature || signature !== FLUTTERWAVE_WEBHOOK_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const payload = req.body;

    // Handle different webhook events
    if (payload.event === 'charge.completed') {
      const { tx_ref, status, amount, currency, customer, id } = payload.data;

      // Find payment record
      const payment = await prisma.payment.findUnique({
        where: { txRef: tx_ref }
      });

      if (!payment) {
        console.error('Payment record not found for webhook:', tx_ref);
        return res.status(404).json({
          success: false,
          message: 'Payment record not found'
        });
      }

      // Update payment status
      if (status === 'successful' && amount >= (payment.amountCents / 100)) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            flwRef: id?.toString(),
            raw: payload.data
          }
        });

        // Assign tier to user (same logic as verify)
        const tierId = (payment.metadata as any)?.tierId;
        if (tierId) {
          const tier = await prisma.tier.findUnique({
            where: { id: tierId }
          });

          if (tier) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + tier.validityDays);

            await prisma.userTier.upsert({
              where: { userId: payment.userId },
              update: {
                tierId: tier.id,
                expiresAt,
                isActive: true,
                examsCreated: 0,
                studyModulesCreated: 0,
                studentsCreated: 0
              },
              create: {
                userId: payment.userId,
                tierId: tier.id,
                expiresAt,
                isActive: true
              }
            });
          }
        }
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            raw: payload.data
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

/**
 * Get user's payment history
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
};

