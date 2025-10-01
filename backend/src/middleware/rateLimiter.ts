import rateLimit from 'express-rate-limit';

// DISABLED FOR TESTING - No rate limiting
export const rateLimiter = (req: any, res: any, next: any) => next();

// DISABLED FOR TESTING - No auth rate limiting
export const authRateLimiter = (req: any, res: any, next: any) => next();

// DISABLED FOR TESTING - No AI rate limiting
export const aiRateLimiter = (req: any, res: any, next: any) => next();

// Original rate limiters (commented out for testing)
/*
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: 'AI generation limit reached, please try again later.',
});
*/