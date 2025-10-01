# HomeSchool Exam System - Complete Technical Documentation
## Full Stack Implementation Guide with React & Node.js

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [React Components](#react-components)
7. [Features & Functionalities](#features--functionalities)
8. [Implementation Guide](#implementation-guide)
9. [Deployment Strategy](#deployment-strategy)

---

## System Overview

The HomeSchool Exam System is a comprehensive educational platform designed for homeschooling families, featuring AI-powered exam generation, interactive learning modules, and advanced analytics.

### Key Technologies
- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **AI Integration**: OpenAI API for content generation
- **File Storage**: AWS S3 or Cloudinary
- **Payment**: Stripe or Flutterwave
- **Real-time**: Socket.io for live features
- **State Management**: Redux Toolkit or Zustand
- **Styling**: Tailwind CSS

---

## Architecture Design

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  Components │  Pages  │  State  │  Services  │   Utils      │
├─────────────────────────────────────────────────────────────┤
│                      API Gateway (Express)                    │
├─────────────────────────────────────────────────────────────┤
│  Auth   │  Exams   │  Study   │  Users   │  Analytics       │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│                    Data Access Layer (Prisma)                 │
├─────────────────────────────────────────────────────────────┤
│                    PostgreSQL Database                        │
└─────────────────────────────────────────────────────────────┘
```

### Folder Structure

#### Backend (Node.js)
```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── auth.js
│   │   └── openai.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── exam.controller.js
│   │   ├── studyModule.controller.js
│   │   ├── user.controller.js
│   │   ├── results.controller.js
│   │   └── analytics.controller.js
│   ├── models/
│   │   └── prisma/schema.prisma
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── validation.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── exam.routes.js
│   │   ├── studyModule.routes.js
│   │   └── user.routes.js
│   ├── services/
│   │   ├── ai.service.js
│   │   ├── grading.service.js
│   │   ├── analytics.service.js
│   │   └── email.service.js
│   ├── utils/
│   │   ├── validators.js
│   │   └── helpers.js
│   └── app.js
├── tests/
├── .env
└── package.json
```

#### Frontend (React)
```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── exam/
│   │   ├── study/
│   │   ├── dashboard/
│   │   └── analytics/
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── exams/
│   │   ├── study/
│   │   └── admin/
│   ├── services/
│   │   ├── api.service.js
│   │   ├── auth.service.js
│   │   └── exam.service.js
│   ├── store/
│   │   ├── slices/
│   │   └── store.js
│   ├── hooks/
│   ├── utils/
│   ├── styles/
│   └── App.jsx
├── public/
└── package.json
```

---

## User Roles & Permissions

### Role Hierarchy
```javascript
const ROLES = {
  ADMIN: {
    id: 'ADMIN',
    permissions: ['*'], // All permissions
    features: {
      userManagement: true,
      systemConfig: true,
      globalAnalytics: true,
      contentModeration: true,
      subscriptionManagement: true
    }
  },
  PARENT: {
    id: 'PARENT',
    permissions: [
      'create_exam', 'manage_children', 'view_family_analytics',
      'create_study_module', 'assign_content', 'manage_subscription'
    ],
    limits: {
      maxChildren: 10,
      maxExamsPerMonth: 50, // Based on subscription
      maxStudyModules: 100
    }
  },
  TEACHER: {
    id: 'TEACHER',
    permissions: [
      'create_exam', 'manage_students', 'view_class_analytics',
      'grade_manually', 'create_study_module', 'manage_classes'
    ],
    limits: {
      maxStudents: 30, // Based on subscription
      maxExamsPerMonth: 100,
      maxClasses: 5
    }
  },
  STUDENT: {
    id: 'STUDENT',
    permissions: [
      'take_exam', 'view_results', 'access_study_modules',
      'view_progress', 'build_portfolio'
    ],
    features: {
      gamification: true,
      achievements: true,
      socialLearning: false
    }
  }
};
```

---

## Database Schema

### Core Tables

```prisma
// User Management
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  password          String
  role              UserRole
  name              String
  avatar            String?
  isActive          Boolean   @default(true)
  emailVerified     Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  subscription      Subscription?
  parentOf          Student[]  @relation("ParentChildren")
  teacherOf         Student[]  @relation("TeacherStudents")
  studentProfile    Student?
  examsCreated      Exam[]
  examAttempts      ExamAttempt[]
  studyModules      StudyModule[]
  classes           Class[]
}

enum UserRole {
  ADMIN
  PARENT
  TEACHER
  STUDENT
}

// Student Profile
model Student {
  id                String    @id @default(uuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id])
  parentId          String?
  parent            User?     @relation("ParentChildren", fields: [parentId], references: [id])
  teacherId         String?
  teacher           User?     @relation("TeacherStudents", fields: [teacherId], references: [id])
  gradeLevel        Int
  dateOfBirth       DateTime

  // Gamification
  xp                Int       @default(0)
  level             Int       @default(1)
  lives             Int       @default(3)
  streak            Int       @default(0)
  badges            Badge[]

  // Relations
  examAssignments   ExamAssignment[]
  moduleAssignments StudyModuleAssignment[]
  examAttempts      ExamAttempt[]
  portfolio         Portfolio?
  performanceData   PerformanceData[]
}

// Exam System
model Exam {
  id                String    @id @default(uuid())
  title             String
  description       String?
  subject           String
  gradeLevel        Int
  difficulty        Difficulty
  duration          Int       // in minutes
  totalMarks        Int
  passingMarks      Int

  createdById       String
  createdBy         User      @relation(fields: [createdById], references: [id])

  questions         Question[]
  assignments       ExamAssignment[]
  attempts          ExamAttempt[]

  isPublished       Boolean   @default(false)
  isAIGenerated     Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Question {
  id                String    @id @default(uuid())
  examId            String
  exam              Exam      @relation(fields: [examId], references: [id], onDelete: Cascade)

  type              QuestionType
  question          String
  options           Json?     // For multiple choice
  correctAnswer     String
  explanation       String?
  marks             Int
  order             Int

  // AI metadata
  difficulty        Difficulty
  topic             String?
  learningObjective String?

  answers           Answer[]
  createdAt         DateTime  @default(now())
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  SHORT_ANSWER
  LONG_ANSWER
  FILL_IN_BLANKS
  MATH
  CODING
  DIAGRAM
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

// Study Modules (Interactive Learning)
model StudyModule {
  id                String    @id @default(uuid())
  title             String
  description       String?
  subject           String
  gradeLevel        Int

  createdById       String
  createdBy         User      @relation(fields: [createdById], references: [id])

  lessons           StudyLesson[]
  assignments       StudyModuleAssignment[]

  totalXP           Int       @default(100)
  estimatedTime     Int       // in minutes

  isPublished       Boolean   @default(false)
  isAIGenerated     Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model StudyLesson {
  id                String    @id @default(uuid())
  moduleId          String
  module            StudyModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  title             String
  order             Int

  steps             StudyStep[]

  requiredXP        Int       @default(0) // XP needed to unlock
  rewardXP          Int       @default(10)

  createdAt         DateTime  @default(now())
}

model StudyStep {
  id                String    @id @default(uuid())
  lessonId          String
  lesson            StudyLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  type              StepType
  content           Json      // Rich content with text, images, etc.
  question          String?
  correctAnswer     String?
  options           Json?
  explanation       String?

  order             Int
  rewardXP          Int       @default(5)

  progress          StudentStepProgress[]
}

enum StepType {
  THEORY
  PRACTICE_EASY
  PRACTICE_MEDIUM
  PRACTICE_HARD
  CHALLENGE
  REVIEW
}

// Assessment & Grading
model ExamAttempt {
  id                String    @id @default(uuid())
  examId            String
  exam              Exam      @relation(fields: [examId], references: [id])
  studentId         String
  student           User      @relation(fields: [studentId], references: [id])

  startedAt         DateTime  @default(now())
  completedAt       DateTime?
  timeSpent         Int?      // in seconds

  answers           Answer[]
  grade             Grade?

  status            AttemptStatus @default(IN_PROGRESS)
}

enum AttemptStatus {
  IN_PROGRESS
  COMPLETED
  ABANDONED
  GRADED
}

model Answer {
  id                String    @id @default(uuid())
  attemptId         String
  attempt           ExamAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  questionId        String
  question          Question  @relation(fields: [questionId], references: [id])

  answer            String
  isCorrect         Boolean?
  marksAwarded      Int?

  // AI Grading
  aiScore           Float?
  aiFeedback        String?

  submittedAt       DateTime  @default(now())
}

model Grade {
  id                String    @id @default(uuid())
  attemptId         String    @unique
  attempt           ExamAttempt @relation(fields: [attemptId], references: [id])

  totalMarks        Int
  obtainedMarks     Int
  percentage        Float
  grade             String?   // A+, A, B, etc.

  feedback          String?
  teacherComments   String?

  isPublished       Boolean   @default(false)
  gradedAt          DateTime  @default(now())
  gradedBy          String?   // Teacher ID if manually graded
}

// Subscription & Billing
model Subscription {
  id                String    @id @default(uuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id])

  plan              SubscriptionPlan
  status            SubscriptionStatus

  startDate         DateTime
  endDate           DateTime

  // Usage Limits
  maxExams          Int
  maxStudents       Int
  maxAIGenerations  Int

  // Current Usage
  examsUsed         Int       @default(0)
  studentsUsed      Int       @default(0)
  aiGenerationsUsed Int       @default(0)

  payments          Payment[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

enum SubscriptionPlan {
  FREE
  BASIC
  PREMIUM
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
  SUSPENDED
}

// Analytics
model PerformanceData {
  id                String    @id @default(uuid())
  studentId         String
  student           Student   @relation(fields: [studentId], references: [id])

  subject           String

  averageScore      Float
  totalExams        Int
  passRate          Float

  strengths         Json      // Topics where student excels
  weaknesses        Json      // Topics needing improvement
  recommendations   Json      // AI-generated recommendations

  periodStart       DateTime
  periodEnd         DateTime

  createdAt         DateTime  @default(now())
}
```

---

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "PARENT",
  "gradeLevel": 5,  // For students only
  "dateOfBirth": "2010-01-15"  // For students only
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "PARENT"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### POST /api/auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "PARENT",
      "subscription": {
        "plan": "PREMIUM",
        "examsRemaining": 45
      }
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Exam Management Endpoints

#### POST /api/exams
Create a new exam.

**Request:**
```json
{
  "title": "Mathematics Mid-Term Exam",
  "subject": "Mathematics",
  "gradeLevel": 5,
  "difficulty": "MEDIUM",
  "duration": 60,
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "question": "What is 15 + 27?",
      "options": ["42", "41", "43", "40"],
      "correctAnswer": "42",
      "marks": 5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "exam_uuid",
    "title": "Mathematics Mid-Term Exam",
    "totalMarks": 100,
    "questionCount": 20,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### POST /api/exams/generate
Generate exam using AI.

**Request:**
```json
{
  "subject": "Science",
  "gradeLevel": 7,
  "topics": ["Photosynthesis", "Cell Structure"],
  "questionCount": 20,
  "difficulty": "MEDIUM",
  "questionTypes": ["MULTIPLE_CHOICE", "SHORT_ANSWER"],
  "duration": 45
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "exam_uuid",
    "title": "Science Assessment - Photosynthesis & Cell Structure",
    "questions": [
      {
        "id": "q_uuid",
        "type": "MULTIPLE_CHOICE",
        "question": "Which organelle is responsible for photosynthesis?",
        "options": ["Chloroplast", "Mitochondria", "Nucleus", "Ribosome"],
        "correctAnswer": "Chloroplast",
        "explanation": "Chloroplasts contain chlorophyll which captures light energy.",
        "marks": 5,
        "difficulty": "MEDIUM",
        "topic": "Photosynthesis"
      }
    ],
    "totalMarks": 100,
    "estimatedTime": 45
  }
}
```

#### GET /api/exams
Get all exams for the user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "exam_uuid",
      "title": "Mathematics Mid-Term",
      "subject": "Mathematics",
      "gradeLevel": 5,
      "questionCount": 20,
      "attempts": 15,
      "averageScore": 78.5,
      "status": "PUBLISHED",
      "createdAt": "2024-01-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

#### POST /api/exams/:id/assign
Assign exam to students.

**Request:**
```json
{
  "studentIds": ["student_uuid_1", "student_uuid_2"],
  "classId": "class_uuid",  // Optional
  "dueDate": "2024-02-01T23:59:59Z",
  "attempts": 2  // Maximum attempts allowed
}
```

### Study Module Endpoints

#### POST /api/study-modules/generate
Generate interactive study module using AI.

**Request:**
```json
{
  "subject": "English",
  "gradeLevel": 4,
  "topic": "Parts of Speech",
  "lessonCount": 5,
  "difficulty": "progressive"  // Starts easy, gets harder
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "module_uuid",
    "title": "Master Parts of Speech",
    "lessons": [
      {
        "id": "lesson_uuid",
        "title": "Introduction to Nouns",
        "order": 1,
        "steps": [
          {
            "type": "THEORY",
            "content": {
              "text": "A noun is a word that names a person, place, thing, or idea.",
              "examples": ["cat", "city", "happiness"],
              "image": "url_to_illustration"
            }
          },
          {
            "type": "PRACTICE_EASY",
            "question": "Which word is a noun?",
            "options": ["Run", "Blue", "Cat", "Quickly"],
            "correctAnswer": "Cat",
            "explanation": "Cat is a noun because it names an animal."
          }
        ],
        "requiredXP": 0,
        "rewardXP": 20
      }
    ],
    "totalXP": 500,
    "estimatedTime": 45
  }
}
```

#### POST /api/study-modules/:id/progress
Update student progress in study module.

**Request:**
```json
{
  "lessonId": "lesson_uuid",
  "stepId": "step_uuid",
  "completed": true,
  "answer": "Cat",
  "timeSpent": 45  // seconds
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "xpEarned": 5,
    "totalXP": 125,
    "level": 3,
    "streak": 7,
    "nextLesson": {
      "id": "next_lesson_uuid",
      "unlocked": true
    },
    "achievement": {
      "name": "Noun Master",
      "description": "Complete all noun lessons",
      "badge": "url_to_badge"
    }
  }
}
```

### Results & Analytics Endpoints

#### GET /api/results/:attemptId
Get exam results for a specific attempt.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "result_uuid",
    "exam": {
      "title": "Science Quiz",
      "totalMarks": 100
    },
    "student": {
      "name": "Jane Doe",
      "id": "student_uuid"
    },
    "obtainedMarks": 85,
    "percentage": 85,
    "grade": "A",
    "answers": [
      {
        "questionId": "q_uuid",
        "question": "What is photosynthesis?",
        "studentAnswer": "Process by which plants make food using sunlight",
        "correctAnswer": "Process by which plants convert light energy into chemical energy",
        "isCorrect": true,
        "marksAwarded": 5,
        "feedback": "Good understanding! Consider mentioning chemical energy conversion."
      }
    ],
    "strengths": ["Cell Biology", "Ecology"],
    "improvements": ["Chemistry"],
    "recommendations": [
      "Review chemical equations in photosynthesis",
      "Practice more problems on cellular respiration"
    ]
  }
}
```

#### GET /api/analytics/student/:id
Get comprehensive analytics for a student.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalExams": 25,
      "averageScore": 78.5,
      "improvementRate": 12.3,
      "currentStreak": 7,
      "totalXP": 2450,
      "level": 12
    },
    "subjectPerformance": [
      {
        "subject": "Mathematics",
        "averageScore": 82,
        "examsCount": 10,
        "trend": "improving",
        "lastScore": 88
      }
    ],
    "recentActivity": [
      {
        "date": "2024-01-15",
        "type": "exam",
        "title": "Math Quiz",
        "score": 88,
        "time": 35
      }
    ],
    "achievements": [
      {
        "name": "Perfect Score",
        "description": "Score 100% on any exam",
        "earnedAt": "2024-01-10",
        "rarity": "RARE"
      }
    ],
    "recommendations": {
      "focus": ["Algebra", "Grammar"],
      "suggested": [
        {
          "type": "study_module",
          "title": "Algebra Fundamentals",
          "reason": "Struggled with algebraic expressions in recent exams"
        }
      ]
    }
  }
}
```

### User Management Endpoints

#### POST /api/students
Create a new student account (for parents/teachers).

**Request:**
```json
{
  "email": "student@example.com",
  "name": "Student Name",
  "gradeLevel": 6,
  "dateOfBirth": "2012-03-15",
  "parentEmail": "parent@example.com"  // Optional
}
```

#### GET /api/students
Get all students for a teacher/parent.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "student_uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "gradeLevel": 6,
      "lastActive": "2024-01-15T14:30:00Z",
      "performance": {
        "average": 78.5,
        "trend": "improving"
      },
      "currentModules": 3,
      "pendingExams": 2
    }
  ]
}
```

---

## React Components

### Core Components Structure

#### Authentication Components
```jsx
// LoginForm.jsx
const LoginForm = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(credentials);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        value={credentials.email}
        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
        placeholder="Email"
      />
      <Input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
        placeholder="Password"
      />
      <Button type="submit" loading={loading}>Login</Button>
      {error && <ErrorMessage message={error} />}
    </form>
  );
};
```

#### Dashboard Components
```jsx
// RoleDashboard.jsx
const RoleDashboard = () => {
  const { user } = useAuth();

  const dashboardComponents = {
    ADMIN: <AdminDashboard />,
    PARENT: <ParentDashboard />,
    TEACHER: <TeacherDashboard />,
    STUDENT: <StudentDashboard />
  };

  return dashboardComponents[user.role] || <div>Invalid Role</div>;
};

// StudentDashboard.jsx
const StudentDashboard = () => {
  const { data: stats } = useQuery('studentStats', fetchStudentStats);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatsCard title="Current XP" value={stats?.xp} icon={<Trophy />} />
      <StatsCard title="Streak" value={stats?.streak} icon={<Fire />} />
      <StatsCard title="Level" value={stats?.level} icon={<Star />} />

      <div className="col-span-3">
        <h2>Assigned Exams</h2>
        <ExamList type="assigned" />
      </div>

      <div className="col-span-3">
        <h2>Study Modules</h2>
        <StudyModuleGrid />
      </div>
    </div>
  );
};
```

#### Exam Components
```jsx
// ExamCreator.jsx
const ExamCreator = () => {
  const [examData, setExamData] = useState({
    title: '',
    subject: '',
    gradeLevel: 1,
    questions: []
  });
  const [useAI, setUseAI] = useState(false);

  const { mutate: createExam } = useMutation(
    useAI ? generateExamWithAI : createManualExam
  );

  if (useAI) {
    return <AIExamGenerator onGenerate={createExam} />;
  }

  return (
    <div>
      <ExamDetailsForm
        data={examData}
        onChange={setExamData}
      />
      <QuestionBuilder
        questions={examData.questions}
        onAdd={(q) => setExamData({
          ...examData,
          questions: [...examData.questions, q]
        })}
      />
      <Button onClick={() => createExam(examData)}>
        Create Exam
      </Button>
    </div>
  );
};

// ExamTaker.jsx
const ExamTaker = ({ examId }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const { data: exam } = useQuery(['exam', examId], () => fetchExam(examId));

  useEffect(() => {
    // Timer logic
    if (exam?.duration) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 0) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [exam]);

  const handleAnswer = (answer) => {
    setAnswers({ ...answers, [exam.questions[currentQuestion].id]: answer });
  };

  const handleSubmit = async () => {
    await submitExam(examId, answers);
  };

  return (
    <div>
      <Timer seconds={timeRemaining} />
      <ProgressBar current={currentQuestion + 1} total={exam?.questions.length} />

      <QuestionDisplay
        question={exam?.questions[currentQuestion]}
        onAnswer={handleAnswer}
        answer={answers[exam?.questions[currentQuestion]?.id]}
      />

      <div className="flex justify-between">
        <Button
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>

        {currentQuestion === exam?.questions.length - 1 ? (
          <Button onClick={handleSubmit} variant="primary">
            Submit Exam
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestion(prev => prev + 1)}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};
```

#### Study Module Components
```jsx
// InteractiveLesson.jsx
const InteractiveLesson = ({ moduleId, lessonId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [lives, setLives] = useState(3);
  const { data: lesson } = useQuery(
    ['lesson', lessonId],
    () => fetchLesson(lessonId)
  );

  const handleStepComplete = async (isCorrect, answer) => {
    if (!isCorrect) {
      setLives(prev => prev - 1);
      if (lives <= 1) {
        // Reset lesson
        setCurrentStep(0);
        setLives(3);
        return;
      }
    }

    await updateProgress(lessonId, lesson.steps[currentStep].id, {
      completed: isCorrect,
      answer
    });

    if (isCorrect && currentStep < lesson.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="lesson-container">
      <div className="lesson-header">
        <Lives count={lives} />
        <XPIndicator current={lesson?.earnedXP} total={lesson?.totalXP} />
      </div>

      <StepRenderer
        step={lesson?.steps[currentStep]}
        onComplete={handleStepComplete}
      />

      <StepProgress
        current={currentStep}
        total={lesson?.steps.length}
      />
    </div>
  );
};

// StepRenderer.jsx
const StepRenderer = ({ step, onComplete }) => {
  switch(step?.type) {
    case 'THEORY':
      return <TheoryStep content={step.content} onNext={() => onComplete(true)} />;

    case 'PRACTICE_EASY':
    case 'PRACTICE_MEDIUM':
    case 'PRACTICE_HARD':
      return (
        <PracticeStep
          question={step.question}
          options={step.options}
          onAnswer={(answer) => onComplete(answer === step.correctAnswer, answer)}
        />
      );

    case 'CHALLENGE':
      return <ChallengeStep step={step} onComplete={onComplete} />;

    default:
      return null;
  }
};
```

#### Analytics Components
```jsx
// PerformanceChart.jsx
const PerformanceChart = ({ studentId, subject }) => {
  const { data } = useQuery(
    ['performance', studentId, subject],
    () => fetchPerformanceData(studentId, subject)
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#8884d8"
          name="Score"
        />
        <Line
          type="monotone"
          dataKey="average"
          stroke="#82ca9d"
          name="Class Average"
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// SubjectRadar.jsx
const SubjectRadar = ({ studentId }) => {
  const { data } = useQuery(
    ['subjectPerformance', studentId],
    () => fetchSubjectPerformance(studentId)
  );

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar
          name="Performance"
          dataKey="score"
          stroke="#8884d8"
          fill="#8884d8"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
```

---

## Features & Functionalities

### 1. AI-Powered Exam Generation

```javascript
// AI Service Implementation
class AIExamService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async generateExam(params) {
    const { subject, gradeLevel, topics, questionCount, difficulty } = params;

    const prompt = this.buildExamPrompt(params);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert educator creating age-appropriate exams."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return this.parseExamResponse(response.choices[0].message.content);
  }

  buildExamPrompt(params) {
    return `
      Create an exam with the following specifications:
      - Subject: ${params.subject}
      - Grade Level: ${params.gradeLevel}
      - Topics: ${params.topics.join(', ')}
      - Number of Questions: ${params.questionCount}
      - Difficulty: ${params.difficulty}

      Include a mix of question types and ensure questions are age-appropriate.
      Format the response as JSON with questions array.
    `;
  }

  async gradeEssay(question, answer, rubric) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert teacher grading student responses."
        },
        {
          role: "user",
          content: `
            Question: ${question}
            Student Answer: ${answer}
            Rubric: ${JSON.stringify(rubric)}

            Provide a score (0-100) and detailed feedback.
          `
        }
      ]
    });

    return this.parseGradingResponse(response.choices[0].message.content);
  }
}
```

### 2. Gamification System

```javascript
// Gamification Service
class GamificationService {
  calculateXP(activity) {
    const xpRates = {
      completeLesson: 20,
      correctAnswer: 5,
      perfectScore: 50,
      dailyStreak: 10,
      challengeComplete: 30
    };

    return xpRates[activity] || 0;
  }

  async updateStudentProgress(studentId, activity, data) {
    const student = await Student.findById(studentId);

    // Update XP
    const xpEarned = this.calculateXP(activity);
    student.xp += xpEarned;

    // Check level up
    const newLevel = Math.floor(student.xp / 100) + 1;
    if (newLevel > student.level) {
      student.level = newLevel;
      await this.triggerLevelUpRewards(studentId, newLevel);
    }

    // Update streak
    const lastActivity = student.lastActivityDate;
    const today = new Date();
    if (this.isConsecutiveDay(lastActivity, today)) {
      student.streak += 1;
    } else if (!this.isSameDay(lastActivity, today)) {
      student.streak = 1;
    }

    // Check achievements
    await this.checkAchievements(student, activity, data);

    await student.save();

    return {
      xpEarned,
      totalXP: student.xp,
      level: student.level,
      streak: student.streak
    };
  }

  async checkAchievements(student, activity, data) {
    const achievements = [
      {
        id: 'first_perfect',
        name: 'Perfectionist',
        condition: (s, a, d) => a === 'perfectScore' && !s.achievements.includes('first_perfect'),
        xpReward: 100
      },
      {
        id: 'week_streak',
        name: 'Week Warrior',
        condition: (s) => s.streak >= 7,
        xpReward: 50
      },
      {
        id: 'subject_master',
        name: 'Subject Master',
        condition: (s, a, d) => d.subjectAverage >= 90,
        xpReward: 200
      }
    ];

    for (const achievement of achievements) {
      if (achievement.condition(student, activity, data)) {
        await this.grantAchievement(student.id, achievement);
      }
    }
  }
}
```

### 3. Real-time Progress Tracking

```javascript
// WebSocket implementation for real-time updates
class RealtimeService {
  constructor(io) {
    this.io = io;
    this.setupHandlers();
  }

  setupHandlers() {
    this.io.on('connection', (socket) => {
      // Join room based on user role
      socket.on('join', async (userId) => {
        const user = await User.findById(userId);
        socket.join(`user:${userId}`);

        if (user.role === 'PARENT') {
          const children = await Student.find({ parentId: userId });
          children.forEach(child => {
            socket.join(`parent:${child.id}`);
          });
        }

        if (user.role === 'TEACHER') {
          const classes = await Class.find({ teacherId: userId });
          classes.forEach(cls => {
            socket.join(`class:${cls.id}`);
          });
        }
      });

      // Real-time exam progress
      socket.on('examProgress', (data) => {
        this.io.to(`parent:${data.studentId}`).emit('childExamProgress', data);
        this.io.to(`class:${data.classId}`).emit('studentExamProgress', data);
      });
    });
  }

  // Emit progress updates
  emitProgress(studentId, data) {
    this.io.to(`user:${studentId}`).emit('progressUpdate', data);
    this.io.to(`parent:${studentId}`).emit('childProgress', data);
  }

  // Emit achievement unlocked
  emitAchievement(studentId, achievement) {
    this.io.to(`user:${studentId}`).emit('achievementUnlocked', achievement);
  }
}
```

### 4. Adaptive Learning Algorithm

```javascript
class AdaptiveLearningService {
  async getNextContent(studentId, subject) {
    const performance = await this.analyzePerformance(studentId, subject);
    const { strengths, weaknesses, currentLevel } = performance;

    // Determine next content difficulty
    let difficulty;
    if (performance.recentAverage < 60) {
      difficulty = 'EASY';
    } else if (performance.recentAverage < 80) {
      difficulty = 'MEDIUM';
    } else {
      difficulty = 'HARD';
    }

    // Find content targeting weaknesses
    const content = await this.findContent({
      subject,
      topics: weaknesses,
      difficulty,
      gradeLevel: currentLevel
    });

    return {
      content,
      reason: `Focus on ${weaknesses[0]} based on recent performance`
    };
  }

  async analyzePerformance(studentId, subject) {
    const attempts = await ExamAttempt.find({
      studentId,
      'exam.subject': subject,
      status: 'GRADED'
    }).populate('answers').limit(10);

    const topicPerformance = {};

    attempts.forEach(attempt => {
      attempt.answers.forEach(answer => {
        const topic = answer.question.topic;
        if (!topicPerformance[topic]) {
          topicPerformance[topic] = { correct: 0, total: 0 };
        }
        topicPerformance[topic].total++;
        if (answer.isCorrect) {
          topicPerformance[topic].correct++;
        }
      });
    });

    // Calculate strengths and weaknesses
    const topics = Object.entries(topicPerformance)
      .map(([topic, stats]) => ({
        topic,
        accuracy: (stats.correct / stats.total) * 100
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    return {
      strengths: topics.filter(t => t.accuracy >= 80).map(t => t.topic),
      weaknesses: topics.filter(t => t.accuracy < 60).map(t => t.topic),
      recentAverage: this.calculateAverage(attempts),
      currentLevel: await this.determineLevel(studentId)
    };
  }
}
```

---

## Implementation Guide

### Phase 1: Foundation (Week 1-2)

#### Backend Setup
```javascript
// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/exams', require('./routes/exam.routes'));
app.use('/api/study-modules', require('./routes/studyModule.routes'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### React Setup
```javascript
// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="exams/*" element={<ExamRoutes />} />
                <Route path="study/*" element={<StudyRoutes />} />
                <Route path="students/*" element={<StudentRoutes />} />
                <Route path="analytics" element={<Analytics />} />
              </Route>
            </Routes>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### Phase 2: Core Features (Week 3-4)

1. **Authentication System**
   - JWT implementation with refresh tokens
   - Role-based access control
   - Protected routes and API endpoints

2. **Exam Management**
   - CRUD operations for exams
   - Question builder interface
   - Assignment system

3. **Basic Dashboard**
   - Role-specific views
   - Statistics display
   - Navigation structure

### Phase 3: AI Integration (Week 5-6)

1. **OpenAI Integration**
   - API setup and configuration
   - Prompt engineering for exam generation
   - Response parsing and validation

2. **AI Grading System**
   - Essay evaluation
   - Feedback generation
   - Manual override capability

### Phase 4: Interactive Learning (Week 7-8)

1. **Study Module System**
   - Lesson structure implementation
   - Step-by-step progression
   - Content delivery system

2. **Gamification**
   - XP and level system
   - Achievement tracking
   - Streak management

### Phase 5: Analytics & Polish (Week 9-10)

1. **Analytics Dashboard**
   - Performance tracking
   - Visualization components
   - Report generation

2. **UI/UX Polish**
   - Responsive design
   - Loading states
   - Error handling
   - Accessibility

---

## Deployment Strategy

### Production Setup

#### Environment Variables
```env
# Backend
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/school_exam
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
OPENAI_API_KEY=your_openai_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=your_bucket
STRIPE_SECRET_KEY=your_stripe_key
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email
SMTP_PASS=your_password

# Frontend
REACT_APP_API_URL=https://api.yourschoolexam.com
REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_public_key
REACT_APP_SOCKET_URL=wss://api.yourschoolexam.com
```

#### Docker Configuration
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "server.js"]

# Frontend Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Deployment Commands
```bash
# Database setup
npx prisma migrate deploy
npx prisma db seed

# Docker deployment
docker-compose up -d

# PM2 deployment (alternative)
pm2 start ecosystem.config.js
```

---

## Conclusion

This comprehensive documentation provides everything needed to recreate the HomeSchool Exam System using React and Node.js. The system is designed to be:

- **Scalable**: Microservices-ready architecture
- **Maintainable**: Clean code structure and separation of concerns
- **Feature-rich**: AI-powered content, gamification, and analytics
- **User-friendly**: Intuitive interface for all user roles
- **Secure**: Proper authentication and authorization

The implementation can be completed in approximately 10 weeks with a dedicated development team, or adjusted based on priority features and available resources.