# Quick Start Guide - Separated Architecture

## Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

## Project Structure
```
/backend     - Node.js Express API server
/frontend    - React Vite SPA
/prisma      - Shared database schema
```

## Development Setup

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration

npm install
npx prisma migrate dev  # Run database migrations
npm run dev            # Start backend on port 5000
```

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api

npm install
npm run dev            # Start frontend on port 3000
```

## Docker Setup (Recommended)

### Start all services:
```bash
# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Migration from Next.js

### Current Status:
✅ Backend Express server setup
✅ Authentication with JWT
✅ Frontend React setup with Vite
✅ Docker configuration
🔄 API route migration in progress
🔄 Component migration pending

### Next Steps:
1. Complete API route migration
2. Migrate React components
3. Update environment variables
4. Test integrated system
5. Deploy to production

## API Documentation

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- POST /api/auth/refresh - Refresh JWT token
- GET /api/auth/profile - Get user profile
- PUT /api/auth/profile - Update profile

### Protected Routes
All other routes require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
OPENAI_API_KEY=your-openai-key
FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Home Schooling Exam System
```

## Troubleshooting

### Database connection issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Reset database
docker-compose down -v
docker-compose up postgres -d
cd backend && npx prisma migrate deploy
```

### Port conflicts
```bash
# Check what's using the ports
netstat -an | findstr :3000
netstat -an | findstr :5000

# Change ports in docker-compose.yml or .env
```

### Build issues
```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## Production Deployment

### Using Docker:
```bash
docker-compose -f docker-compose.yml up -d
```

### Manual deployment:
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist folder with nginx/apache
```

## Support
For issues or questions, check the MIGRATION_GUIDE.md for detailed information.