# AI-Powered Homeschooling Examination System

A comprehensive Next.js-based examination and learning management system designed for homeschooling families with AI-powered exam generation and grading.

## Features

### Core Features
- **AI-Powered Exam Generation**: Automatically generate exams based on subject, grade level, and topics
- **Intelligent Grading**: AI grades all question types including essays with detailed feedback
- **Role-Based Access**: Separate dashboards for Admin, Parents/Teachers, and Students
- **Responsive Design**: Fully responsive UI that works on desktop, tablet, and mobile
- **Real-time Analytics**: Track student progress and performance

### User Roles

#### Students
- Take AI-generated exams
- View results with detailed feedback
- Access study materials
- Track learning progress

#### Parents/Teachers
- Create exams using AI
- Monitor student progress
- Manage multiple children
- Access analytics and reports

#### Admin
- User management
- System configuration
- Global analytics
- Content moderation

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Custom components with Lucide icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/homeschooling-exam-system.git
cd homeschooling-exam-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/homeschool_exam"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
OPENAI_API_KEY="your-openai-api-key"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
/app
  /(auth)         # Authentication pages (login, register)
  /(dashboard)    # Protected dashboard pages
    /dashboard    # Main dashboard
    /exams        # Exam management
    /results      # Results viewing
    /analytics    # Performance analytics
    /admin        # Admin panel
  /api           # API routes
    /auth        # Auth endpoints
    /exams       # Exam CRUD and generation

/components
  /dashboard     # Dashboard components (Sidebar, Navbar)
  /ui           # Reusable UI components

/lib
  /ai-service.ts # AI integration for exam generation/grading
  /auth.ts       # NextAuth configuration
  /db.ts         # Prisma client
  /utils.ts      # Utility functions

/prisma
  /schema.prisma # Database schema

/types          # TypeScript type definitions
```

## Key Features Implementation

### AI Exam Generation
The system uses OpenAI's GPT-4 to generate comprehensive exams with:
- Multiple question types (MCQ, True/False, Essays, etc.)
- Grade-appropriate content
- Customizable difficulty levels
- Topic-specific questions

### AI Grading
Automatic grading for all question types:
- Objective questions (instant grading)
- Essays and long answers (AI evaluation)
- Partial credit support
- Detailed feedback generation

### Security
- JWT-based authentication
- Role-based access control
- Protected API routes
- Input validation and sanitization

## Database Schema

Key models:
- **User**: Stores user accounts with roles
- **Exam**: Exam metadata and configuration
- **Question**: Individual exam questions
- **ExamAttempt**: Student exam attempts
- **Answer**: Student answers
- **Grade**: Grading results and feedback

## Deployment

### Vercel Deployment

1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy

### Database Setup
Use services like:
- Supabase
- Neon
- Railway
- PlanetScale

## Development Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm run start

# Database
npx prisma studio     # Open Prisma Studio
npx prisma db push    # Push schema changes
npx prisma generate   # Generate Prisma client

# Linting
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ for homeschooling families