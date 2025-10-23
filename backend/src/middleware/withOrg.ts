// middleware/withOrg.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';

export const withOrg = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  // Read orgId from header (frontend sends the selected org)
  const orgId = req.header('x-org-id');

  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  // Check that the user belongs to this org
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, orgId, status: 'ACTIVE' },
    include: { org: true },
  });

  if (!membership) {
    return res.status(403).json({ success: false, message: 'You are not a member of this organization' });
  }

  // Attach org context to request
  (req as any).orgId = membership.orgId;
  (req as any).orgRole = membership.role;
  (req as any).orgName = membership.org.name;

  next();
};
