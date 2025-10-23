import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { generateUniqueCode } from '../utils/generateUniqueCode';
import { sendInviteEmail } from './emailControllers';

// Define who can invite whom
const INVITE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ['ADMIN', 'TEACHER', 'PARENT'],
  ADMIN: ['TEACHER', 'PARENT'],
  TEACHER: ['PARENT'], // Teachers only invite parents
  PARENT: [], // Parents cannot invite anyone
  STUDENT: [] // Students cannot invite anyone
};

export const sendInvite = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    const inviterId = (req as any).user?.id;

    // Validate required fields
    if (!inviterId || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing inviter, email, or role'
      });
    }

    // Get inviter's membership and role
    const inviterMembership = await prisma.membership.findFirst({
      where: { userId: inviterId, status: 'ACTIVE' },
      select: { orgId: true, role: true }
    });

    if (!inviterMembership) {
      return res.status(400).json({
        success: false,
        message: 'Inviter does not belong to any organization'
      });
    }

    // Check if inviter has permission to invite this role
    const allowedRoles = INVITE_PERMISSIONS[inviterMembership.role] || [];

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `${inviterMembership.role}s cannot invite ${role}s. ${inviterMembership.role === 'TEACHER'
          ? 'Teachers can only invite PARENTS. Students should be created directly.'
          : ''
          }`
      });
    }

    // Check if user is already a member of this organization
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: {
            orgId: inviterMembership.orgId,
            status: 'ACTIVE'
          }
        }
      }
    });

    if (existingUser && existingUser.memberships.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this organization'
      });
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await prisma.invite.findFirst({
      where: {
        email,
        orgId: inviterMembership.orgId,
        status: 'PENDING'
      }
    });

    if (existingInvite) {
      return res.status(400).json({
        success: false,
        message: 'An invite has already been sent to this email'
      });
    }

    const orgId = inviterMembership.orgId;
    const code = await generateUniqueCode();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    // Create invite
    const invite = await prisma.invite.create({
      data: {
        orgId,
        inviterId,
        email,
        role,
        code,
        status: 'PENDING',
        expiresAt,
      }
    });

    // Get organization and inviter details for email
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true }
    });

    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { name: true }
    });

    // Send invite email
    await sendInviteEmail(
      email,
      code,
      organization?.name || 'your organization',
      inviter?.name || 'Someone'
    );

    res.json({
      success: true,
      inviteId: invite.id,
      message: 'Invite sent successfully',
      inviteDetails: {
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt
      }
    });
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invite'
    });
  }
};

export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Invite code is required'
      });
    }

    // Find the invite
    const invite = await prisma.invite.findUnique({
      where: { code },
      include: {
        organization: {
          select: { name: true, type: true }
        }
      }
    });

    if (!invite || invite.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invite'
      });
    }

    // Check if invite has expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      // Mark as expired
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' }
      });

      return res.status(400).json({
        success: false,
        message: 'This invite has expired. Please request a new one.'
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: invite.email },
      include: {
        memberships: {
          where: {
            orgId: invite.orgId,
            status: 'ACTIVE'
          }
        }
      }
    });

    if (!user) {
      // User does not exist, frontend should redirect to register
      return res.status(200).json({
        success: true,
        message: 'User not found, please register to accept the invite',
        invite: {
          email: invite.email,
          code: invite.code,
          orgId: invite.orgId,
          role: invite.role,
          organizationName: invite.organization?.name
        }
      });
    }

    // Check if user is already a member
    if (user.memberships.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this organization'
      });
    }

    // Create membership for existing user
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        orgId: invite.orgId,
        role: invite.role,
        status: 'ACTIVE'
      }
    });

    // Mark invite as accepted
    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy: user.id
      }
    });

    res.json({
      success: true,
      message: 'Invite accepted successfully',
      userId: user.id,
      orgId: invite.orgId,
      membershipId: membership.id,
      role: membership.role,
      organizationName: invite.organization?.name
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept invite'
    });
  }
};

export const getSentInvites = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = (req as any).orgId;

    if (!user || !orgId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Fetch the user's role in this organization
    const membership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        orgId: orgId,
      },
      select: { role: true },
    });


    if (!membership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this organization' });
    }

    // Build the query based on the user's org role
    const whereClause: any = { orgId };
    if (membership.role === 'TEACHER') {
      whereClause.inviterId = user.id; // Teacher sees only invites they sent
    }

    const invites = await prisma.invite.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return res.json({ success: true, invites });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch invites' });
  }
};


export const cancelInvite = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const inviteId = req.params.id;

    if (!userId || !inviteId) {
      return res.status(400).json({
        success: false,
        message: 'Missing user or invite ID'
      });
    }

    // Fetch invite
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
      include: { organization: true },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    if (invite.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending invites can be cancelled'
      });
    }

    // Check if user is allowed to cancel: inviter or org admin/owner
    const membership = await prisma.membership.findFirst({
      where: { userId, orgId: invite.orgId, status: 'ACTIVE' },
      select: { role: true },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You do not belong to this organization'
      });
    }

    const allowedRoles = ['ADMIN', 'OWNER'];
    const isInviter = invite.inviterId === userId;

    if (!isInviter && !allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this invite'
      });
    }

    // Cancel invite
    await prisma.invite.update({
      where: { id: inviteId },
      data: { status: 'CANCELLED' },
    });

    res.json({
      success: true,
      message: 'Invite cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel invite'
    });
  }
};

export const resendInvite = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const inviteId = req.params.id;

    if (!userId || !inviteId) {
      return res.status(400).json({
        success: false,
        message: 'Missing user or invite ID'
      });
    }

    // Fetch invite
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
      include: {
        organization: { select: { name: true } },
        inviter: { select: { name: true } }
      },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    if (invite.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending invites can be resent'
      });
    }

    // Check permission
    const membership = await prisma.membership.findFirst({
      where: { userId, orgId: invite.orgId, status: 'ACTIVE' },
      select: { role: true },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You do not belong to this organization'
      });
    }

    const allowedRoles = ['ADMIN', 'OWNER'];
    const isInviter = invite.inviterId === userId;

    if (!isInviter && !allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to resend this invite'
      });
    }

    // Check if expired and extend
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      await prisma.invite.update({
        where: { id: inviteId },
        data: { expiresAt: newExpiresAt }
      });
    }

    // Resend email
    await sendInviteEmail(
      invite.email,
      invite.code,
      invite.organization?.name || 'your organization',
      invite.inviter?.name || 'Someone'
    );

    res.json({
      success: true,
      message: 'Invite resent successfully'
    });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend invite'
    });
  }
};

// Public endpoint - no auth required, uses invite code
export const resendInviteByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Invite code is required'
      });
    }

    // Find the invite
    const invite = await prisma.invite.findUnique({
      where: { code },
      include: {
        organization: { select: { name: true } },
        inviter: { select: { name: true } }
      },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    if (invite.status === 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'This invite has already been accepted'
      });
    }

    if (invite.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'This invite has been cancelled'
      });
    }

    // ✅ EXPIRED invites can also be resent, reset status to PENDING
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: 'PENDING', // reset expired invite
        expiresAt: newExpiresAt
      }
    });

    // Resend email
    try {
      await sendInviteEmail(
        invite.email,
        invite.code,
        invite.organization?.name || 'your organization',
        invite.inviter?.name || 'Someone'
      );
    } catch (err) {
      console.error('Failed to send invite email:', err);
    }

    res.json({
      success: true,
      message: 'Invite resent successfully. Please check your email.'
    });
  } catch (error) {
    console.error('Resend invite by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend invite'
    });
  }
};
