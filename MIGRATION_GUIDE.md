# Migration Guide: Next.js to Separate Backend + Frontend

## Architecture Overview

### Before (Next.js Monolith)
- Single Next.js application handling both frontend and API
- Server-side rendering with API routes
- Shared deployment and scaling

### After (Separated Architecture)
- **Backend**: Node.js + Express + TypeScript API
- **Frontend**: React + Vite SPA
- Independent scaling and deployment
- Clear separation of concerns

## Project Structure

```
homeSchoolingExamSystem/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── controllers/    # Business logic
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, rate limiting, etc
│   │   ├── services/       # External services (OpenAI, payments)
│   │   ├── utils/          # Helpers and utilities
│   │   └── server.ts       # Express server entry
│   ├── prisma/             # Database schema (shared)
│   └── package.json
│
├── frontend/               # React Vite SPA
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API client
│   │   ├── stores/        # State management
│   │   └── main.tsx       # React app entry
│   └── package.json
│
└── docker-compose.yml      # Multi-service orchestration
```

## Migration Steps

### Phase 1: Backend Setup ✅
1. Created Express server with TypeScript
2. Set up middleware (auth, CORS, rate limiting)
3. Configured logging and error handling
4. Database connection using Prisma

### Phase 2: API Migration (In Progress)
1. Migrate authentication endpoints
2. Move all `/api` routes to Express controllers
3. Update authentication to use JWT tokens
4. Implement refresh token mechanism

### Phase 3: Frontend Setup
1. Create Vite React application
2. Set up React Router for client-side routing
3. Implement authentication context
4. Create API client service

### Phase 4: Component Migration
1. Move React components from Next.js
2. Replace Next.js specific features:
   - `next/link` → React Router `Link`
   - `next/image` → Regular `img` or image optimization library
   - `next/head` → React Helmet
3. Update data fetching patterns

## Key Changes

### Authentication
**Before (NextAuth):**
```typescript
// Using NextAuth with sessions
import { getServerSession } from "next-auth/next"
```

**After (JWT):**
```typescript
// Using JWT tokens with Express
const token = localStorage.getItem('token');
fetch('/api/endpoint', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### API Calls
**Before (Next.js API Routes):**
```typescript
// pages/api/exams/route.ts
export async function GET(req: NextRequest) {
  // Handle request
}
```

**After (Express):**
```typescript
// backend/src/controllers/examController.ts
export const getExams = async (req: Request, res: Response) => {
  // Handle request
}
```

### Environment Variables
**Backend (.env):**
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=...
OPENAI_API_KEY=...
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Home Schooling Exam System
```

## Running the Application

### Development Mode
```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### Production Build
```bash
# Build both services
cd backend && npm run build
cd ../frontend && npm run build

# Run with Docker
docker-compose up
```

## API Endpoint Mapping

| Next.js Route | Express Endpoint | Status |
|--------------|------------------|---------|
| /api/auth/[...nextauth] | /api/auth/login, /api/auth/register | ✅ |
| /api/exams | /api/exams | 🔄 |
| /api/study-modules | /api/study-modules | 🔄 |
| /api/classes | /api/classes | 🔄 |
| /api/payments | /api/payments | 🔄 |
| /api/subscriptions | /api/subscriptions | 🔄 |

## Benefits of Separation

1. **Independent Scaling**: Scale API servers separately from frontend
2. **Technology Flexibility**: Use different tech stacks for each service
3. **Team Organization**: Backend and frontend teams can work independently
4. **API Reusability**: Serve mobile apps, partner integrations
5. **Performance**: Optimize each service for its specific needs
6. **Deployment**: Deploy services independently

## Next Steps

1. Complete API migration for all routes
2. Set up React frontend with Vite
3. Migrate all components and pages
4. Configure CI/CD pipelines
5. Set up monitoring and logging
6. Performance testing and optimization