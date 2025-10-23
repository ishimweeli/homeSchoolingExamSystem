import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import bcrypt from 'bcryptjs';
import { sendStudentCredentialsEmail, sendAssignedToOrgEmail } from './emailControllers';

const createStudentSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  password: z.string().min(4),
  email: z.string().email(),
});

export const listOwnedStudents = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = (req as any).orgId;

    if (!user || !orgId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized or missing org context',
      });
    }

    // Fetch membership for current org
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, orgId, status: 'ACTIVE' },
      select: { role: true },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'No active membership in this organization',
      });
    }

    let whereClause: any;

    switch (membership.role) {
      case 'TEACHER':
        // Teacher: see only students they created in this org
        whereClause = {
          AND: [
            { role: 'STUDENT' },
            { createdById: user.id },
            {
              memberships: {
                some: { orgId, status: 'ACTIVE' },
              },
            },
          ],
        };
        break;

      case 'PARENT':
        // Parent: see students linked to them in this org
        whereClause = {
          AND: [
            { role: 'STUDENT' },
            { parentId: user.id },
            {
              memberships: {
                some: { orgId, status: 'ACTIVE' },
              },
            },
          ],
        };
        break;

      case 'ADMIN':
      case 'OWNER':
        // Admin/Owner: see all students in org
        whereClause = {
          role: 'STUDENT',
          memberships: { some: { orgId, status: 'ACTIVE' } },
        };
        break;

      case 'STUDENT':
        // Student: see only themselves
        whereClause = { id: user.id };
        break;

      default:
        // Other roles: return empty
        whereClause = { id: null };
    }

    const students = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, name: true, username: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: students });
  } catch (error) {
    console.error('Failed to fetch students:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
    });
  }
};


export const createStudent = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = (req as any).orgId;
    const orgName = (req as any).orgName;

    if (!user || !orgId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized or missing org context',
      });
    }

    // Validate input
    const data = createStudentSchema.parse(req.body);

    // Get membership for current org
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, orgId, status: 'ACTIVE' },
      select: { role: true },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'No active membership in this organization',
      });
    }

    const orgRole = membership.role;

    // Only allow creating student if role in this org is TEACHER, PARENT, ADMIN, or OWNER
    const allowedRoles = ['TEACHER', 'PARENT', 'ADMIN', 'OWNER'];
    if (!allowedRoles.includes(orgRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create student in this organization',
      });
    }

    // Check if student exists globally
    let student = await prisma.user.findUnique({ where: { email: data.email } });

    if (student) {
      // Check if student already has membership in this org
      let membership = await prisma.membership.findFirst({
        where: { userId: student.id, orgId },
      });

      if (!membership) {
        // Add membership to this org
        membership = await prisma.membership.create({
          data: { userId: student.id, orgId, role: 'STUDENT', status: 'ACTIVE' },
        });
      }

      // Link parent if current role is PARENT
      if (orgRole === 'PARENT' && student.parentId !== user.id) {
        await prisma.user.update({
          where: { id: student.id },
          data: { parentId: user.id },
        });
      }

      if (student.email && student.name && orgName) {
        await sendAssignedToOrgEmail(student.email, student.name, orgName);
      }

      return res.status(201).json({
        success: true,
        message: 'Student assigned to this organization',
        data: { id: student.id, name: student.name, email: student.email, orgId },
      });
    }

    // Create new student
    const hashedPassword = await bcrypt.hash(data.password, 10);

    student = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        username: data.username,
        password: hashedPassword,
        role: 'STUDENT',
        emailVerified: new Date(),
        parentId: orgRole === 'PARENT' ? user.id : null,
        createdById: orgRole === 'TEACHER' ? user.id : null,
      },
    });

    // Add membership in current org
    await prisma.membership.create({
      data: { userId: student.id, orgId, role: 'STUDENT', status: 'ACTIVE' },
    });

    if (student.email && student.username) {
      await sendStudentCredentialsEmail(student.email, student.username, data.password);
    }

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: {
        id: student.id,
        name: student.name,
        username: student.username,
        email: student.email,
        orgId,
      },
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ success: false, message: 'Failed to create student' });
  }
};


export const getStudent = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;

    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        memberships: { select: { orgId: true } },
      },
    });

    if (!student || student.role !== 'STUDENT')
      return res.status(404).json({ success: false, message: 'Student not found' });

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      select: { orgId: true },
    });

    const userOrgIds = memberships.map(m => m.orgId);
    const studentOrgIds = student.memberships.map(m => m.orgId);
    const isAuthorized = studentOrgIds.some(id => userOrgIds.includes(id));

    if (!isAuthorized)
      return res.status(403).json({ success: false, message: 'Not your student' });

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Failed to fetch student:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student' });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { name, username, password } = req.body;

    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        memberships: { select: { orgId: true } },
      },
    });

    if (!student || student.role !== 'STUDENT')
      return res.status(404).json({ success: false, message: 'Student not found' });

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      select: { orgId: true },
    });

    const userOrgIds = memberships.map(m => m.orgId);
    const studentOrgIds = student.memberships.map(m => m.orgId);
    const isAuthorized = studentOrgIds.some(id => userOrgIds.includes(id));

    if (!isAuthorized)
      return res.status(403).json({ success: false, message: 'Not your student' });

    const data: any = {};
    if (name) data.name = name;
    if (username) {
      const exists = await prisma.user.findFirst({
        where: { username, NOT: { id } },
      });
      if (exists)
        return res.status(400).json({ success: false, message: 'Username already taken' });
      data.username = username;
    }
    if (password) data.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, username: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update student:', error);
    res.status(500).json({ success: false, message: 'Failed to update student' });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = (req as any).orgId;
    const { id } = req.params;

    if (!user || !orgId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const student = await prisma.user.findUnique({
      where: { id },
      include: { memberships: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const userMembership = await prisma.membership.findFirst({
      where: { userId: user.id, orgId },
    });

    if (!userMembership) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    let removeMembership = false;

    // ---------------- TEACHER ----------------
    if (userMembership.role === 'TEACHER') {
      if (student.createdById === user.id) {
        await prisma.user.update({ where: { id }, data: { createdById: null } });
        removeMembership = !student.parentId; // Remove membership only if not linked to parent
      }
    }

    // ---------------- PARENT ----------------
    else if (userMembership.role === 'PARENT') {
      if (student.parentId === user.id) {
        await prisma.user.update({ where: { id }, data: { parentId: null } });
        removeMembership = !student.createdById; // Remove membership only if not linked to teacher
      }
    }

    // ---------------- OWNER / ADMIN ----------------
    else if (['OWNER', 'ADMIN'].includes(userMembership.role)) {
      // Remove all memberships in this org
      await prisma.membership.deleteMany({ where: { userId: id, orgId } });

      // Delete user if no memberships left
      const remaining = await prisma.membership.findMany({ where: { userId: id } });
      if (remaining.length === 0) {
        await prisma.user.delete({ where: { id } });
      }

      return res.json({ success: true, message: 'Student removed from organization' });
    } else {
      return res.status(403).json({ success: false, message: 'Cannot remove student' });
    }

    // Remove membership only if student has no other links in this org
    if (removeMembership) {
      await prisma.membership.deleteMany({ where: { userId: id, orgId } });
    }

    return res.json({ success: true, message: 'Student removed from organization' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: 'Failed to delete student' });
  }
};