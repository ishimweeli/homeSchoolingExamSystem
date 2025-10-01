import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import bcrypt from 'bcryptjs';
import { incrementTierUsage } from '../middleware/tierLimits';

const createStudentSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  password: z.string().min(4),
});

export const listOwnedStudents = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const where = (req as any).user.role === 'TEACHER'
      ? { createdById: (req as any).user.id, role: 'STUDENT' }
      : { parentId: (req as any).user.id, role: 'STUDENT' };

    const students = await prisma.user.findMany({
      where: where as any,
      select: { id: true, name: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!['PARENT', 'TEACHER'].includes((req as any).user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const data = createStudentSchema.parse(req.body);

    const existing = await prisma.user.findFirst({ where: { username: data.username } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const hashed = await bcrypt.hash(data.password, 10);

    const student = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: hashed,
        role: 'STUDENT',
        emailVerified: new Date(),
        parentId: (req as any).user.role === 'PARENT' ? (req as any).user.id : null,
        createdById: (req as any).user.role === 'TEACHER' ? (req as any).user.id : null,
      },
      select: { id: true, name: true, username: true, role: true, createdAt: true },
    });

    // No tier limit for student creation - unlimited students allowed

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to create student' });
  }
};

export const getStudent = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;

    const student = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, username: true, role: true, parentId: true, createdById: true } });
    if (!student || student.role !== 'STUDENT') return res.status(404).json({ success: false, message: 'Student not found' });

    if ((req as any).user.role === 'PARENT' && student.parentId !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Not your student' });
    }
    if ((req as any).user.role === 'TEACHER' && student.createdById !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Not your student' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch student' });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;
    const { name, username, password } = req.body as { name?: string; username?: string; password?: string };

    const student = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, parentId: true, createdById: true } });
    if (!student || student.role !== 'STUDENT') return res.status(404).json({ success: false, message: 'Student not found' });

    if ((req as any).user.role === 'PARENT' && student.parentId !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Not your student' });
    }
    if ((req as any).user.role === 'TEACHER' && student.createdById !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Not your student' });
    }

    const data: any = {};
    if (name) data.name = name;
    if (username) {
      const exists = await prisma.user.findFirst({ where: { username, NOT: { id } } });
      if (exists) return res.status(400).json({ success: false, message: 'Username already taken' });
      data.username = username;
    }
    if (password) data.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({ where: { id }, data, select: { id: true, name: true, username: true } });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to update student' });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;

    const student = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, parentId: true, createdById: true } });
    if (!student || student.role !== 'STUDENT') return res.status(404).json({ success: false, message: 'Student not found' });

    if ((req as any).user.role === 'PARENT' && student.parentId !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Not your student' });
    }
    if ((req as any).user.role === 'TEACHER' && student.createdById !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Not your student' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete student' });
  }
};


