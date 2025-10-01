import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../utils/db';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Only configure Google OAuth if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: profile.emails?.[0]?.value },
              {
                accounts: {
                  some: {
                    provider: 'google',
                    providerAccountId: profile.id,
                  },
                },
              },
            ],
          },
          include: {
            accounts: true,
          },
        });

        if (user) {
          // Check if Google account is linked
          const hasGoogleAccount = user.accounts.some(
            (acc) => acc.provider === 'google' && acc.providerAccountId === profile.id
          );

          if (!hasGoogleAccount) {
            // Link Google account
            await prisma.account.create({
              data: {
                userId: user.id,
                type: 'oauth',
                provider: 'google',
                providerAccountId: profile.id,
                access_token: accessToken,
                refresh_token: refreshToken,
              },
            });
          }
        } else {
          // Create new user with Google account
          user = await prisma.user.create({
            data: {
              email: profile.emails?.[0]?.value,
              name: profile.displayName,
              emailVerified: new Date(),
              image: profile.photos?.[0]?.value,
              role: 'STUDENT', // Default role
              accounts: {
                create: {
                  type: 'oauth',
                  provider: 'google',
                  providerAccountId: profile.id,
                  access_token: accessToken,
                  refresh_token: refreshToken,
                },
              },
            },
            include: {
              accounts: true,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
  );
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
      },
    });
    done(null, user);
  } catch (error) {
    done(error, undefined);
  }
});

export default passport;