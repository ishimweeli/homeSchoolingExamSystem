# Deployment Guide - Home Schooling Exam System

This guide explains how to deploy the Home Schooling Exam System using Docker.

## Prerequisites

- Docker installed on your server
- Docker Compose installed (or Docker with Compose V2)
- Git installed (optional, for auto-pulling updates)

## Quick Start

### 1. Configure Secrets

Edit `docker-compose.yml` and replace all placeholder values with your actual secrets:

**Required Configuration:**

```yaml
# Database (line 32)
DATABASE_URL: postgresql://user:password@your-neon-endpoint.neon.tech/database?sslmode=require

# JWT Secrets (lines 38-39) - Generate with: openssl rand -base64 32
JWT_SECRET: your_strong_jwt_secret_key_here_minimum_32_characters_long
JWT_REFRESH_SECRET: your_strong_jwt_refresh_secret_key_here_minimum_32_characters

# OpenAI API (line 44)
OPENAI_API_KEY: sk-proj-your_openai_api_key_here

# Flutterwave Payment (lines 48-51)
FLUTTERWAVE_PUBLIC_KEY: FLWPUBK_TEST-your_public_key_here
FLUTTERWAVE_SECRET_KEY: FLWSECK_TEST-your_secret_key_here
FLUTTERWAVE_ENCRYPTION_KEY: FLWSECK_TEST-your_encryption_key_here
FLUTTERWAVE_WEBHOOK_SECRET: your_webhook_secret_here

# Email SMTP (lines 61-62)
SMTP_USER: your-email@gmail.com
SMTP_PASS: your-app-specific-password

# Google OAuth (lines 65-66)
GOOGLE_CLIENT_ID: your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET: your-google-client-secret

# Admin Account (lines 69-70)
ADMIN_EMAIL: admin@example.com
ADMIN_PASSWORD: ChangeThisSecurePassword123!
```

**Optional Configuration:**

Update URLs if deploying to a custom domain or IP:

```yaml
# Frontend URL (line 56)
FRONTEND_URL: http://your-domain.com  # or http://SERVER_IP:5001

# Payment Redirect (line 52)
FLUTTERWAVE_REDIRECT_URL: http://your-domain.com/payment/callback

# Frontend API URL (line 97)
args:
  VITE_API_URL: http://your-domain.com/api  # or http://SERVER_IP:5000/api
```

### 2. Deploy

Run the deployment script:

```bash
# Linux/Mac/Git Bash on Windows
./deploy.sh
```

The script will:
1. Pull latest code from git
2. Stop existing containers
3. Build Docker images
4. Start containers
5. Run database migrations
6. Display status and logs

### 3. Access the Application

Once deployed:
- **Frontend**: http://localhost:5001
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Manual Deployment

If you prefer to deploy manually:

```bash
# Pull latest code
git pull origin main

# Stop existing containers
docker-compose down

# Build images
docker-compose build --no-cache

# Start containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Port Configuration

| Service | External Port | Internal Port |
|---------|--------------|---------------|
| Frontend | 5001 | 80 |
| Backend | 5000 | 5000 |
| Redis | 6379 | 6379 |

To change external ports, edit the `ports` section in `docker-compose.yml`:

```yaml
ports:
  - "YOUR_PORT:INTERNAL_PORT"
```

## Common Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Check container status
docker-compose ps

# Execute command in backend container
docker-compose exec backend sh

# Run database migrations manually
docker-compose exec backend npx prisma migrate deploy

# View Prisma schema
docker-compose exec backend npx prisma studio
```

## Database Migrations

Database migrations run automatically on container startup. To run manually:

```bash
docker-compose exec backend npx prisma migrate deploy
```

## Troubleshooting

### Containers won't start

Check logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Backend health check fails

1. Check if database is accessible:
```bash
docker-compose exec backend npx prisma db push
```

2. Verify environment variables:
```bash
docker-compose exec backend printenv | grep DATABASE_URL
```

### Frontend can't reach backend

1. Check if backend is running:
```bash
curl http://localhost:5000/health
```

2. Verify VITE_API_URL in docker-compose.yml (line 97)

### Permission errors

Create required directories:
```bash
mkdir -p backend/logs uploads
chmod -R 755 backend/logs uploads
```

### Redis connection errors

Restart Redis:
```bash
docker-compose restart redis
```

## Production Deployment Checklist

- [ ] Replace all placeholder secrets in docker-compose.yml
- [ ] Use production database URL (not test/staging)
- [ ] Use production Flutterwave keys (not TEST keys)
- [ ] Generate strong JWT secrets (min 32 characters)
- [ ] Configure production domain URLs
- [ ] Set up SSL/TLS certificate (use nginx reverse proxy)
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerts
- [ ] Configure automatic backups
- [ ] Test payment gateway in production
- [ ] Test email delivery
- [ ] Verify Google OAuth redirect URLs

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `docker-compose.yml` with real secrets to version control
- Use strong, randomly generated secrets for JWT
- Use production API keys only in production environment
- Keep this file secure and restrict access
- Regularly rotate secrets and API keys
- Monitor logs for suspicious activity

## Updating the Application

To update with latest changes:

```bash
# Option 1: Use deploy script (recommended)
./deploy.sh

# Option 2: Manual update
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Environment-Specific Deployments

If you need multiple environments (dev, staging, production), create separate compose files:

```bash
# docker-compose.dev.yml
# docker-compose.staging.yml
# docker-compose.production.yml
```

Then deploy with:

```bash
docker-compose -f docker-compose.staging.yml up -d
```

## Backup and Restore

### Backup Redis Data
```bash
docker-compose exec redis redis-cli BGSAVE
docker cp homeschool-redis:/data/dump.rdb ./backup/
```

### Backup Uploaded Files
```bash
tar -czf uploads-backup.tar.gz uploads/
```

### Restore
```bash
# Restore Redis
docker cp ./backup/dump.rdb homeschool-redis:/data/
docker-compose restart redis

# Restore uploads
tar -xzf uploads-backup.tar.gz
```

## Getting Help

- Check logs: `docker-compose logs -f`
- Verify configuration: `docker-compose config`
- GitHub Issues: [Report issues here]
- Documentation: See `.env.example` for all available configuration options

---

**Last Updated**: 2025-01-25
