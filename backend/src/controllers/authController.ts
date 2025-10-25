import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/db';
import crypto from 'crypto';
import mailer from '../config/mailerConfig';
import { OrgType, Role } from '@prisma/client';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  username: z.string().min(3).optional(),
  role: z.enum(['PARENT', 'TEACHER', 'STUDENT', 'ADMIN']).default('PARENT'),
  inviteCode: z.string().optional()
});

const loginSchema = z.object({
  emailOrUsername: z.string(),
  password: z.string()
});

const generateToken = (user: any): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET || 'default-secret-key',
    {
      expiresIn: '7d'
    }
  );
};

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { inviteCode, ...userData } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          ...(userData.username ? [{ username: userData.username }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Check invite if present
    let invite: any = null;
    let inviteRole: Role | undefined;
    if (inviteCode) {
      invite = await prisma.invite.findUnique({ where: { code: inviteCode } });

      if (!invite || invite.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Invalid or expired invite' });
      }
      if (invite.email !== userData.email) {
        return res.status(400).json({
          success: false,
          message: 'Registration email must match the invited email address'
        });
      }

      inviteRole = invite.role; // Force role from invite
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // 1️⃣ Create User
      const user = await tx.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          role: inviteRole || userData.role,
          emailVerified: new Date(),
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          username: true
        }
      });

      let membership;
      let organization;

      if (invite) {
        // 2️⃣ Create Membership from invite
        membership = await tx.membership.create({
          data: {
            userId: user.id,
            orgId: invite.orgId,
            role: inviteRole!,
            status: 'ACTIVE'
          }
        });

        // 3️⃣ Mark invite as accepted
        await tx.invite.update({
          where: { id: invite.id },
          data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedBy: user.id }
        });
      } else {
        // Determine organization type for normal registration
        let orgType: OrgType;
        let membershipRole: Role;

        switch (user.role) {
          case 'TEACHER':
            orgType = OrgType.SOLO_TEACHER;
            membershipRole = 'OWNER' as any;
            break;
          case 'PARENT':
            orgType = OrgType.FAMILY;
            membershipRole = 'OWNER' as any;
            break;
          case 'ADMIN':
            orgType = OrgType.SCHOOL;
            membershipRole = 'OWNER' as any;
            break;
          default:
            orgType = OrgType.FAMILY;
            membershipRole = 'OWNER' as any;
        }

        // 2️⃣ Create Organization
        organization = await tx.organization.create({
          data: {
            name: `${user.name || user.username || user.email}'s ${orgType.toLowerCase()} organization`,
            type: orgType,
            ownerId: user.id
          }
        });

        // 3️⃣ Create Membership
        membership = await tx.membership.create({
          data: {
            userId: user.id,
            orgId: organization.id,
            role: membershipRole,
            status: 'ACTIVE'
          }
        });
      }

      return { user, organization, membership };
    });

    // 4️⃣ Generate tokens outside transaction
    const token = jwt.sign(
      { id: result.user.id, email: result.user.email, role: result.membership.role, orgId: result.membership.orgId },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as any
    );

    const refreshToken = jwt.sign(
      { id: result.user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as any
    );


    // 5️⃣ Send verification email (non-blocking)
    try {
      await sendVerificationEmail(result.user.email!);
    } catch (emailErr) {
      console.error('Error sending verification email:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: invite ? 'Invite accepted and registration successful' : 'Registration successful',
      data: {
        ...result,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const sendVerificationEmail = async (email: string) => {
  try {
    const verificationEmail = await prisma.verificationToken.create({
      data: {
        identifier: email!,
        token: crypto.randomBytes(32).toString('hex'),
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    });

    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: email!,
      subject: "Account Verification Email",
      html: `
        <h1>Email Verification</h1>
        <p>Please verify your email by clicking the link below:</p>
        <a href='${process.env.FRONTEND_URL}/verify-email?token=${verificationEmail.token}'>Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `
    })
  } catch (error) {
    console.error("Error sending verification email: ", error);
    throw new Error('Could not send verification email');
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = loginSchema.parse(req.body);

    const isEmail = emailOrUsername.includes('@');

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: isEmail ? emailOrUsername : undefined },
          { username: !isEmail ? emailOrUsername : undefined },
          { email: emailOrUsername },
          { username: emailOrUsername }
        ].filter(condition =>
          condition.email !== undefined || condition.username !== undefined
        )
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Please use OAuth login for this account' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is disabled' });
    }

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    // Fetch user's organizations
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { org: { select: { id: true, name: true } } },
    });

    const organizations = memberships.map(m => ({
      id: m.org.id,
      name: m.org.name,
      role: m.role,
      joinedAt: m.createdAt
    }));

    // Optionally select first org as active
    const activeMembership = memberships[0]; // or pick the org user selected
    const token = jwt.sign(
      { id: user.id, email: user.email, role: activeMembership.role, orgId: activeMembership?.orgId, },
      process.env.JWT_SECRET as jwt.Secret, // cast to Secret
      { expiresIn: '1h' } // SignOptions
    );


    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as any
    );

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role
        },
        token,
        refreshToken,
        organizations
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as any
    );

    const newRefreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as any
    );

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userAuth = req.user as { id: string; email: string; name?: string };
    const orgId = (req as any).orgId;

    if (!userAuth || !orgId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated or organization not selected',
      });
    }

    // Fetch membership for active organization
    const membership = await prisma.membership.findFirst({
      where: { userId: userAuth.id, orgId },
      select: {
        role: true,
        org: { select: { id: true, name: true } },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'No membership in this organization',
      });
    }

    // Fetch user basic info
    const user = await prisma.user.findUnique({
      where: { id: userAuth.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        createdAt: true,
        lastLogin: true,
        subscriptions: {
          select: { tier: true, status: true, startedAt: true, expiresAt: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: membership.role, // <-- role in active organization
        organization: membership.org,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        subscriptions: user.subscriptions,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
    });
  }
};


export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const userAuth = req.user as { id: string; email: string; role: string; name?: string };
    const { name, username, avatar } = req.body;

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userAuth.id }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userAuth.id },
      data: {
        ...(name && { name }),
        ...(username && { username }),
        ...(avatar && { avatar })
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    // Generate JWT tokens
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as any
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as any
    );

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

// ===== Password Reset & Email Verification =====

const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().min(10), password: z.string().min(8) });
const verifySchema = z.object({ token: z.string().min(10) });

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = emailSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond success to avoid user enumeration
    if (!user) {
      return res.json({ success: true, message: 'If an account exists, a reset link was sent' });
    }

    // Remove existing tokens for this identifier
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.verificationToken.create({ data: { identifier: email, token, expires } });

    // TODO: email sending integration. For now, log for dev
    // console.log('Password reset link:', `${process.env.FRONTEND_URL}/reset-password?token=${token}`);

    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: email!,
      subject: "Password Reset Email",
      html: `
        <h1>Password Reset</h1>
        <p>Please reset your password by clicking the link below:</p>
        <a href='${process.env.FRONTEND_URL}/reset-password?token=${token}'>Password reset link</a>
        <p>This link will expire in 24 hours.</p>
      `
    })

    res.status(200).json({ success: true, message: 'If an account exists, a reset link was sent' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    res.status(200).json({ success: true, message: 'If an account exists, a reset link was sent' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = resetSchema.parse(req.body);

    const vt = await prisma.verificationToken.findUnique({ where: { token } });
    if (!vt || vt.expires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({ where: { email: vt.identifier } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    await prisma.verificationToken.delete({ where: { token } });

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Password reset failed' });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = emailSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a verification link was sent' });
    }
    if (user.emailVerified) {
      return res.json({ success: true, message: 'Email already verified' });
    }

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
    await prisma.verificationToken.create({ data: { identifier: email, token, expires } });

    await sendVerificationEmail(email);

    res.json({ success: true, message: 'Verification link sent if email exists' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Unable to process request' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = verifySchema.parse(req.query);
    const vt = await prisma.verificationToken.findUnique({ where: { token: token } });
    if (!vt || vt.expires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }
    const user = await prisma.user.findUnique({ where: { email: vt.identifier } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    await prisma.verificationToken.delete({ where: { token: vt.token } });
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.log("Error verifying email: ", error)
    res.status(400).json({ success: false, message: 'Verification failed' });
  }
};

// Get current user (me) endpoint
export const me = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        image: true,
        createdAt: true,
        lastLogin: true,
        isActive: true,
        _count: {
          select: {
            createdExams: true,
            createdStudyModules: true,
            examAttempts: true,
            studyAssignments: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
};

// Logout endpoint
export const logout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (userId) {
      // Optionally track logout time using lastLogin field
      // Note: We could use lastLogin to track last activity
      await prisma.user
        .update({
          where: { id: userId },
          data: { lastLogin: new Date() }
        })
        .catch(err => {
          console.error('Error updating lastLogin on logout:', err);
        });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

export const getUserOrganizations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Find all orgs the user belongs to
    const memberships = await prisma.membership.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        org: {
          select: { id: true, name: true, createdAt: true },
        },
      },
    });

    // Transform the data
    const organizations = memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    return res.json({
      success: true,
      organizations,
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch organizations' });
  }
};