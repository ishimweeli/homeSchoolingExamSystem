# Docker Setup for Home Schooling Exam System

## Prerequisites
- Docker Desktop installed and running
- Your `.env.local` file configured with your database and API keys

## Quick Start

### 1. Install Docker
Run PowerShell as Administrator:
```powershell
.\install-docker.ps1
```

### 2. Verify Docker Installation
```powershell
.\verify-docker.ps1
```

### 3. Start the Application
```bash
# Start with your existing Neon database
npm run docker:up

# View logs
npm run docker:logs

# Stop the application
npm run docker:down
```

## Environment Variables

The Docker setup automatically uses your `.env.local` file, so you don't need to maintain separate environment files. Your existing configuration will work seamlessly in Docker.

### Key Environment Variables Used:
- `DATABASE_URL` - Your Neon PostgreSQL database URL
- `NEXTAUTH_SECRET` - Authentication secret key
- `NEXTAUTH_URL` - Application URL (defaults to http://localhost:3001)
- `OPENAI_API_KEY` - OpenAI API key for AI features

## Available Docker Commands

```bash
# Build the Docker image
npm run docker:build

# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Restart services
npm run docker:restart

# Rebuild from scratch
npm run docker:rebuild
```

## Docker Compose Files

### `docker-compose.yml`
Main configuration file that:
- Builds and runs the Next.js application
- Uses your existing Neon database (no local PostgreSQL needed)
- Includes Redis for caching (optional)
- Automatically loads your `.env.local` file

### `docker-compose.override.yml`
Development overrides (automatically loaded):
- Mounts source code for development
- Sets development environment variables
- Optimized for local development

### `docker-compose.prod.yml`
Production configuration:
- Includes health checks
- Resource limits
- Nginx reverse proxy (optional)
- Optimized for production deployment

## Production Deployment

For production use:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Docker not found
- Ensure Docker Desktop is installed and running
- Restart your terminal after installation

### Port already in use
- The app runs on port 3001 by default
- Stop any other services using this port

### Database connection issues
- Verify your `DATABASE_URL` in `.env.local` is correct
- Ensure your Neon database is accessible

### Environment variables not loading
- Check that `.env.local` exists and is properly formatted
- Verify the file is being mounted correctly in Docker

## Architecture

```
┌─────────────────────┐
│   Browser (3001)    │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Next.js App       │
│   (Docker Container)│
├─────────────────────┤
│ - Uses .env.local   │
│ - Connects to Neon  │
│ - Redis for cache   │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Neon Database     │
│   (Cloud Hosted)    │
└─────────────────────┘
```

## Security Notes

- `.env.local` is mounted read-only in Docker
- Sensitive files are excluded via `.dockerignore`
- Production builds don't include development dependencies
- Environment variables are never committed to the repository

## Support

For issues or questions, check the main README or open an issue in the repository.