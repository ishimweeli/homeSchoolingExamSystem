# Use the official Node.js 18 image as the base image
FROM node:18-alpine AS base

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl libc6-compat

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install all dependencies (including dev dependencies) for building
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Set environment variables for build time - using your production database
ENV DATABASE_URL="postgresql://neondb_owner:npg_wPT5x7MgmZVv@ep-raspy-dew-a85w6sl0-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"
ENV NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
ENV NEXTAUTH_URL="http://127.0.0.1:3001"
ENV OPENAI_API_KEY="dummy-openai-key-for-build-only"
ENV NODE_ENV="production"
ENV UPLOADTHING_SECRET="sk_live_your-secret-key-here"
ENV UPLOADTHING_APP_ID="your-app-id-here"
ENV SMTP_HOST="smtp.gmail.com"
ENV SMTP_PORT="587"
ENV SMTP_USER="your-email@gmail.com"
ENV SMTP_PASS="your-app-password"
ENV FROM_EMAIL="noreply@homeschool.com"

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public directory if it exists
COPY --from=builder /app/public* ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3001

ENV PORT=3001
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]