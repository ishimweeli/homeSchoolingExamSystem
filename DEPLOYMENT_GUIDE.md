# Deployment Guide

This project deploys a Node.js/Express API and a React SPA as Docker containers to DigitalOcean. PostgreSQL (Neon) backs the API. A PowerShell script orchestrates build and deployment.

- Backend: backend (Node.js/Express/TypeScript, port 5004 production)
- Frontend: frontend (React + Vite, built to static assets served by Nginx)
- Database: PostgreSQL (Neon managed database)
- Cache: Redis (port 6381 production)
- AI: OpenAI (key required)
- Payments: Flutterwave (keys required)
- Deploy script: deploy.ps1 (root)

Important: Environment variables are required for API, DB, AI keys, and payment processing. Frontend env vars must use VITE_* prefix.

## 1) Prerequisites

Local:
- Docker Desktop and Docker Compose
- PowerShell 7+ (for deploy.ps1 script)
- Node.js 18+ (for local development)
- npm or yarn
- Access to DigitalOcean Droplet/Registry (or Docker Hub) and SSH

Production:
- DigitalOcean Droplet (with Docker + Compose installed) or App Platform
- Domain/SSL handled at infra level (recommended: use Nginx reverse proxy with Let's Encrypt)
- Neon PostgreSQL database (or managed PostgreSQL)

## 2) Environment Configuration

Backend (environment variables or .env):
- NODE_ENV=production
- PORT=5000
- DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
- REDIS_URL=redis://redis:6379
- JWT_SECRET=<strong-random-secret>
- JWT_REFRESH_SECRET=<strong-random-secret>
- JWT_EXPIRES_IN=1h
- JWT_REFRESH_EXPIRES_IN=7d
- OPENAI_API_KEY=<openai-key>
- OPENAI_MODEL=gpt-4o-mini
- FLUTTERWAVE_PUBLIC_KEY=<flw-public-key>
- FLUTTERWAVE_SECRET_KEY=<flw-secret-key>
- FLUTTERWAVE_ENCRYPTION_KEY=<flw-encryption-key>
- FLUTTERWAVE_WEBHOOK_SECRET=<flw-webhook-secret>
- FLUTTERWAVE_REDIRECT_URL=http://your-domain.com/payment/callback
- FLUTTERWAVE_CURRENCY=RWF
- FRONTEND_URL=http://your-domain.com
- SMTP_HOST=<smtp-host>
- SMTP_PORT=<smtp-port>
- SMTP_USER=<smtp-user>
- SMTP_PASS=<smtp-password>
- GOOGLE_CLIENT_ID=<google-oauth-client-id>
- GOOGLE_CLIENT_SECRET=<google-oauth-secret>
- ADMIN_EMAIL=<admin-email>
- ADMIN_PASSWORD=<admin-password>

Frontend (.env):
- VITE_API_URL=https://<api-domain>:5004/api or /api if behind reverse proxy

Database:
- Ensure database exists and user has privileges
- Prisma migrations run automatically on container startup via docker-compose command
- Seeds initial data if needed (check backend/prisma/seed.ts)

## 3) Docker Artifacts (by convention)

- backend/Dockerfile
  - Multi-stage: npm build (TypeScript compilation) -> slim Node runtime
  - Exposes 5000
  - Uses environment variables for configuration
  - Includes health check endpoint at /health

- frontend/Dockerfile
  - Multi-stage: Vite build -> Nginx static server
  - Exposes 80
  - Includes SPA routing and /api proxy to backend

- docker-compose.yml (root - development)
  - Services: redis, backend, frontend
  - Networks and volumes for Redis persistence
  - Environment injection from .env files
  - Ports: frontend:5001, backend:5000, redis:6379

- docker-compose.staging.yml
  - Staging configuration
  - Ports: frontend:5005, backend:5004, redis:6381

- docker-compose.production.yml
  - Production configuration
  - Ports: frontend:5005, backend:5004, redis:6381
  - Can use pre-built images from registry or build locally

- deploy.ps1 (root)
  - Orchestrates image build, tag, push, and remote compose up on the Droplet
  - Supports multiple environments (Development, Staging, Production)
  - Health checks and rollback support

Note: If your repo places these files differently, adjust paths accordingly.

## 4) Local Development (non-Docker)

Backend:
```powershell
cd backend
npm install
npm run dev
# API on http://localhost:5000
# Uses nodemon for hot reload
```

Frontend:
```powershell
cd frontend
npm install
npm run dev
# App on http://localhost:5173 (Vite dev server)
# Configure VITE_API_URL in .env for API proxy
```

## 5) Local Development (Docker Compose)

Create a root .env (not committed) with DB and service env variables (see .env.example), then:

```powershell
docker-compose up --build
```

Typical compose responsibilities:
- Build backend image from backend/Dockerfile
- Build frontend image from frontend/Dockerfile
- Start Redis with a volume for persistence
- Wire network between services
- Map ports (backend:5000, frontend:5001, redis:6379)
- Pass env vars to each container
- Auto-run Prisma migrations on backend startup

Stop:
```powershell
docker-compose down
# add -v to remove volumes if you want a clean Redis cache
```

View logs:
```powershell
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 6) Production Build (Images)

Backend:
```powershell
cd backend
npm ci
npm run build
docker build -t <registry>/<namespace>/homeschool-backend:$(git rev-parse --short HEAD) .
```

Frontend:
```powershell
cd frontend
npm ci
npm run build
docker build --build-arg VITE_API_URL=http://YOUR_SERVER:5004/api -t <registry>/<namespace>/homeschool-frontend:$(git rev-parse --short HEAD) .
```

Push:
```powershell
docker login <registry>
docker push <registry>/<namespace>/homeschool-backend:<tag>
docker push <registry>/<namespace>/homeschool-frontend:<tag>
```

## 7) DigitalOcean Deployment (deploy.ps1)

The root PowerShell script deploy.ps1 deploys both services. The common flow:

1. Resolve version/tag (e.g., commit SHA or semantic version)
2. Build backend and frontend images
3. Log in to your registry (DOCR or Docker Hub)
4. Push images
5. SSH into Droplet
6. Pull images on Droplet
7. docker-compose up -d to apply new versions
8. Optional: prune old images and health checks

### Usage Examples

**Deploy to Production:**
```powershell
# From repo root on Windows
.\deploy.ps1 -Environment Production -DropletHost 192.168.1.100

# With specific tag
.\deploy.ps1 -Environment Production -DropletHost 192.168.1.100 -Tag v1.2.3

# With custom user
.\deploy.ps1 -Environment Production -DropletHost 192.168.1.100 -User admin

# With health checks
.\deploy.ps1 -Environment Production -DropletHost 192.168.1.100 -HealthCheck

# Skip build (deploy existing images)
.\deploy.ps1 -Environment Production -DropletHost 192.168.1.100 -SkipBuild
```

**Deploy to Staging:**
```powershell
.\deploy.ps1 -Environment Staging -DropletHost 192.168.1.50
```

**Local Development:**
```powershell
.\deploy.ps1 -Environment Development
```

### Script Parameters

- **-Environment** (required): Development, Staging, or Production
- **-Tag** (optional): Docker image tag (default: git commit SHA)
- **-DropletHost** (optional): IP/hostname of droplet (can also use env var: PRODUCTION_SERVER_IP, STAGING_SERVER_IP)
- **-User** (optional): SSH user (default: root)
- **-ComposeFile** (optional): Custom compose file
- **-SkipBuild**: Skip building images
- **-SkipPush**: Skip pushing to registry
- **-HealthCheck**: Run health checks after deployment
- **-Registry** (optional): Registry URL (default: registry.digitalocean.com/homeschool-registry)

### Script responsibilities

- Validates prerequisites (Docker, Git)
- Builds backend and frontend images with proper tags
- Pushes images to registry
- SSHs into Droplet and executes deployment commands
- Pulls latest code from appropriate branch (staging/production)
- Runs docker-compose pull and up -d
- Cleans up old images
- Optionally runs health checks
- Provides clear success/failure feedback (exits non-zero on failure for CI)

## 8) Production Compose (on the Droplet)

A typical production docker-compose.production.yml includes:
- Redis cache service (port 6381 externally)
- Backend service with env and port 5004
- Frontend service with Nginx on port 5005
- Network for service communication
- Volume for Redis data persistence

Optional reverse proxy setup (recommended):
- Use Nginx or Caddy in front of frontend and backend
- Serve frontend on port 80/443
- Proxy /api requests to backend:5000
- Handle SSL/TLS with Let's Encrypt

Restart after changes:
```bash
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
docker system prune -f  # optional cleanup
```

## 9) Zero-Downtime and Rollback

- Use versioned tags (not latest) in compose files or script
- To rollback:
  ```bash
  cd /opt/homeschool-app-production
  git log  # Find previous commit
  git checkout <previous-commit-hash>
  ./deploy-production.sh  # or run deploy.ps1 from local with that tag
  ```

Alternative using deploy.ps1:
```powershell
# Deploy previous version by tag
.\deploy.ps1 -Environment Production -DropletHost 192.168.1.100 -Tag <previous-tag>
```

## 10) Troubleshooting

### Ports
- Backend must be reachable at 5004 (production) or 5000 (development)
- Frontend must point to correct API URL (VITE_API_URL)
- Ensure firewall allows ports 5004 and 5005 (or use reverse proxy on 80/443)

### Environment Variables
- Frontend env must start with VITE_ to be embedded at build time
- Backend picks up from env overriding defaults
- Check .env file exists and has all required variables

### Database
- Verify connectivity and credentials
- Check DATABASE_URL format: postgresql://user:pass@host:port/db?sslmode=require
- If schema is missing, Prisma migrations run automatically on startup
- Check migration status: `npx prisma migrate status`

### Logs
- Docker logs: `docker logs <container_name> -f`
- Backend logs: Available in ./backend/logs directory
- Check for database connection errors, missing env vars, or API key issues

### OpenAI
- Ensure OPENAI_API_KEY is set on backend container
- Check OPENAI_MODEL is valid (gpt-4o-mini recommended)
- Rate limits may cause 429 errors

### Flutterwave (Payments)
- Use test keys for staging, production keys for production
- Verify webhook secret matches Flutterwave dashboard
- Check FLUTTERWAVE_REDIRECT_URL points to correct domain

### Redis
- Ensure Redis is running: `docker-compose ps`
- Check Redis logs: `docker-compose logs redis`
- Verify REDIS_URL in backend env

### Common Issues

**"Cannot connect to database"**
- Check DATABASE_URL is correct
- Ensure Neon database allows connections from droplet IP
- Verify SSL mode is enabled

**"Frontend shows 404 for all routes"**
- Nginx SPA routing may not be configured
- Check frontend/Dockerfile has correct nginx config

**"API calls failing with CORS"**
- Ensure FRONTEND_URL in backend matches actual frontend URL
- Check CORS configuration in backend/src/server.ts

**"Container keeps restarting"**
- Check container logs: `docker logs <container>`
- Usually indicates missing env vars or failed health check

## 11) Security and Domains

- SSL/Domain: Use Nginx reverse proxy with Let's Encrypt or DigitalOcean Load Balancer
- CORS: Backend allows frontend domain via FRONTEND_URL env var
- JWT Secrets: Must be strong random strings; do not commit them
- Database: Ensure SSL mode is enabled (Neon requires sslmode=require)
- Rate Limiting: Enabled on all /api routes via backend middleware
- API Keys: Use test keys for staging, production keys for production only
- Passwords: Admin password should be strong and unique

## 12) Checklist Before Deploy

- [ ] Backend builds: `cd backend && npm run build`
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] VITE_API_URL correct for production (set in .env or deploy script)
- [ ] Database URL reachable from backend container (test connection)
- [ ] All required environment variables set (see section 2)
- [ ] OPENAI_API_KEY present and valid
- [ ] Flutterwave keys configured (test in staging first)
- [ ] SMTP credentials configured for email
- [ ] Google OAuth credentials set up
- [ ] docker-compose.production.yml uses correct ports and env vars
- [ ] SSH access to production droplet verified
- [ ] Redis running and accessible
- [ ] Firewall rules configured on droplet
- [ ] Backup database before major deployments
- [ ] Test deployment in staging first
- [ ] Monitor logs after deployment

## 13) CI/CD with GitHub Actions

The project includes automated deployment workflows:

### Workflows
- `.github/workflows/deploy-staging.yml` - Auto-deploy on push to staging branch
- `.github/workflows/deploy-production.yml` - Auto-deploy on push to production branch

### Required GitHub Secrets
- `STAGING_SSH_PRIVATE_KEY` - SSH key for staging server
- `STAGING_SERVER_IP` - Staging server IP
- `STAGING_SERVER_USER` - SSH user for staging
- `PRODUCTION_SSH_PRIVATE_KEY` - SSH key for production server
- `PRODUCTION_SERVER_IP` - Production server IP
- `PRODUCTION_SERVER_USER` - SSH user for production
- `REPO_URL` - GitHub repository URL

### Workflow Process
1. Push to staging/production branch
2. GitHub Actions connects via SSH
3. Pulls latest code on server
4. Runs deployment script (deploy-staging.sh or deploy-production.sh)
5. Rebuilds and restarts containers
6. Cleans up old images

## 14) Initial Server Setup

On each Digital Ocean droplet:

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 2. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Install Git
sudo apt update
sudo apt install -y git

# 4. Create app directory
sudo mkdir -p /opt/homeschool-app-production
cd /opt/homeschool-app-production

# 5. Clone repository
git clone -b production https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# 6. Create .env file
cp .env.example .env
nano .env
# Fill in all required environment variables

# 7. Update server IPs in docker-compose file
nano docker-compose.production.yml
# Replace YOUR_PRODUCTION_SERVER_IP with actual IP

# 8. Make deployment scripts executable
chmod +x deploy-production.sh

# 9. Run initial deployment
./deploy-production.sh

# 10. (Optional) Set up firewall
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 5004/tcp   # Backend API
sudo ufw allow 5005/tcp   # Frontend
sudo ufw enable

# 11. (Optional) Set up Nginx reverse proxy
sudo apt install -y nginx certbot python3-certbot-nginx
# Configure nginx to proxy to frontend:5005 and backend:5004
```

## 15) Monitoring and Maintenance

### Check Container Status
```bash
docker-compose -f docker-compose.production.yml ps
```

### View Logs
```bash
docker-compose -f docker-compose.production.yml logs -f
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
```

### Restart Services
```bash
docker-compose -f docker-compose.production.yml restart
docker-compose -f docker-compose.production.yml restart backend
```

### Database Backup
```bash
# Backup Neon database (if using pg_dump)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Or use Neon's built-in backup features
```

### Update Dependencies
```bash
# Pull latest code
git pull origin production

# Rebuild images
docker-compose -f docker-compose.production.yml build

# Restart services
docker-compose -f docker-compose.production.yml up -d
```

### Clean Up
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (careful!)
docker volume prune

# Complete cleanup
docker system prune -a --volumes
```

## 16) Performance Optimization

- **Redis Caching**: Already configured for session management and caching
- **Database Connection Pooling**: Prisma handles connection pooling automatically
- **Static Asset Caching**: Nginx serves frontend with caching headers
- **Image Optimization**: Use multi-stage builds (already implemented)
- **Environment Variables**: Use production values (NODE_ENV=production)
- **Log Level**: Set appropriate log level in production (INFO or WARN)
- **Rate Limiting**: Already configured on API routes
- **Health Checks**: Configured in Dockerfiles for container orchestration

## 17) Scaling Considerations

- **Horizontal Scaling**: Use Docker Swarm or Kubernetes for multiple instances
- **Load Balancer**: Use DigitalOcean Load Balancer or Nginx upstream
- **Database**: Consider read replicas for high traffic (Neon supports this)
- **Redis**: Use Redis Cluster for high availability
- **CDN**: Serve static frontend assets via CDN (CloudFlare, etc.)
- **Monitoring**: Add monitoring tools (Prometheus, Grafana, New Relic, etc.)

## 18) Development Workflow

1. **Local Development**: Work on `main` branch locally
2. **Testing**: Merge to `staging` branch → Auto-deploys to staging server
3. **Verification**: Test on staging environment
4. **Production**: Merge `staging` to `production` → Auto-deploys to production
5. **Monitoring**: Monitor logs and health endpoints
6. **Rollback**: If issues, rollback to previous version (see section 9)

## 19) Support and Resources

- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **Prisma**: https://www.prisma.io/docs
- **Neon**: https://neon.tech/docs
- **DigitalOcean**: https://docs.digitalocean.com/
- **Nginx**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **GitHub Actions**: https://docs.github.com/en/actions

---

**Last Updated**: 2025-10-19
**Version**: 2.0
**Maintainer**: Homeschool Exam System Team
