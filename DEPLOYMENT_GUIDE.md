# Deployment Guide

This guide explains how to deploy the Homeschool Exam System to staging and production environments using Digital Ocean.

## 🏗️ Architecture

- **Staging Branch** → Deploys to Staging Server
- **Production Branch** → Deploys to Production Server
- Both environments use the same Neon PostgreSQL database
- Separate Docker Compose configurations for each environment

## 📋 Prerequisites

### Required GitHub Secrets

You need to configure the following secrets in your GitHub repository:

#### Staging Secrets
- `STAGING_SSH_PRIVATE_KEY` - SSH private key for staging server
- `STAGING_SERVER_IP` - IP address of staging server
- `STAGING_SERVER_USER` - SSH user for staging server (e.g., root)
- `REPO_URL` - Your GitHub repository URL (e.g., `https://github.com/username/repo.git`)

#### Production Secrets
- `PRODUCTION_SSH_PRIVATE_KEY` - SSH private key for production server
- `PRODUCTION_SERVER_IP` - IP address of production server
- `PRODUCTION_SERVER_USER` - SSH user for production server (e.g., root)
- `REPO_URL` - Your GitHub repository URL (same as above)

### Digital Ocean Server Setup

For each server (staging and production), you need:

1. **Ubuntu Droplet** (recommended: 2GB RAM minimum)
2. **Docker installed**
3. **Docker Compose installed**
4. **Git installed**
5. **SSH access configured**

## 🚀 Deployment Process

### Automatic Deployment (via GitHub Actions)

#### Deploy to Staging
```bash
# Merge or push changes to the staging branch
git checkout staging
git merge main  # or make your changes
git push origin staging
```

GitHub Actions will automatically:
1. Connect to your staging server
2. Pull the latest code from the staging branch
3. Build Docker images
4. Start/restart containers
5. Clean up old images

#### Deploy to Production
```bash
# Merge or push changes to the production branch
git checkout production
git merge staging  # or merge from main
git push origin production
```

### Manual Deployment (on the server)

#### On Staging Server
```bash
ssh user@STAGING_SERVER_IP
cd /opt/homeschool-app-staging
./deploy-staging.sh
```

#### On Production Server
```bash
ssh user@PRODUCTION_SERVER_IP
cd /opt/homeschool-app-production
./deploy-production.sh
```

## 🔧 Configuration

### Environment-Specific Settings

The docker-compose files contain all environment variables:
- `docker-compose.staging.yml` - Staging configuration
- `docker-compose.production.yml` - Production configuration

**Important**: Update these placeholders in both files:
- `YOUR_STAGING_SERVER_IP` → Your staging server IP
- `YOUR_PRODUCTION_SERVER_IP` → Your production server IP

### Database

Both environments use the same Neon PostgreSQL database:
```
postgresql://neondb_owner:npg_wPT5x7MgmZVv@ep-raspy-dew-a85w6sl0-pooler.eastus2.azure.neon.tech/neondb?sslmode=require
```

> **Note**: For production, consider using a separate production database for better isolation.

## 📂 File Structure

```
.
├── docker-compose.yml              # Development environment
├── docker-compose.staging.yml      # Staging environment
├── docker-compose.production.yml   # Production environment
├── deploy-staging.sh               # Manual staging deployment script
├── deploy-production.sh            # Manual production deployment script
├── .github/workflows/
│   ├── deploy-staging.yml         # Auto-deploy to staging on push
│   └── deploy-production.yml      # Auto-deploy to production on push
├── backend/
│   └── Dockerfile                 # Backend Docker configuration
└── frontend/
    └── Dockerfile                 # Frontend Docker configuration
```

## 🌐 Accessing the Applications

### Staging
- Frontend: `http://STAGING_SERVER_IP:5001`
- Backend API: `http://STAGING_SERVER_IP:5000`

### Production
- Frontend: `http://PRODUCTION_SERVER_IP:5001`
- Backend API: `http://PRODUCTION_SERVER_IP:5000`

## 🛠️ Initial Server Setup

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
sudo mkdir -p /opt/homeschool-app-staging  # or /opt/homeschool-app-production
cd /opt/homeschool-app-staging

# 5. Clone repository
git clone -b staging https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# 6. Make deployment script executable
chmod +x deploy-staging.sh

# 7. Update server IPs in docker-compose file
nano docker-compose.staging.yml
# Replace YOUR_STAGING_SERVER_IP with actual IP

# 8. Run deployment
./deploy-staging.sh
```

## 🔒 Security Notes

1. **SSH Keys**: Use separate SSH keys for staging and production
2. **Secrets**: Never commit sensitive data to the repository
3. **Database**: Consider using separate databases for staging/production
4. **API Keys**: Use test keys for staging, production keys for production
5. **Firewall**: Configure firewall rules to allow only necessary ports

## 🐛 Troubleshooting

### Check Container Status
```bash
docker-compose -f docker-compose.staging.yml ps
```

### View Container Logs
```bash
docker-compose -f docker-compose.staging.yml logs -f backend
docker-compose -f docker-compose.staging.yml logs -f frontend
```

### Restart Containers
```bash
docker-compose -f docker-compose.staging.yml restart
```

### Stop All Containers
```bash
docker-compose -f docker-compose.staging.yml down
```

### Clean Up
```bash
docker system prune -a
```

## 📝 Workflow

1. **Development**: Work on `main` branch locally
2. **Testing**: Merge to `staging` branch → Auto-deploys to staging
3. **Production**: Merge `staging` to `production` → Auto-deploys to production

## 🔄 Rollback

If you need to rollback:

```bash
# On the server
cd /opt/homeschool-app-production
git log  # Find the commit to rollback to
git checkout <commit-hash>
./deploy-production.sh
```
