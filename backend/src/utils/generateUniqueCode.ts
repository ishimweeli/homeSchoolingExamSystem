import crypto from 'crypto';
import { prisma } from './db';

/**
 * Generate a unique 8-character alphanumeric code for invites.
 * Retries up to maxRetries times before throwing an error.
 */
export const generateUniqueCode = async (): Promise<string> => {
  let code: string;
  let exists = true;
  let retries = 0;
  const maxRetries = 10;

  do {
    if (retries >= maxRetries) {
      throw new Error('Failed to generate a unique code after multiple attempts.');
    }

    // 8-character alphanumeric code
    code = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Check if code already exists in DB
    const existing = await prisma.invite.findUnique({ where: { code } });
    exists = !!existing;

    retries++;
  } while (exists);

  return code;
};
