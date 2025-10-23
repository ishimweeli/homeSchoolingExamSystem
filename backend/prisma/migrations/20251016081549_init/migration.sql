-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PARENT', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR', 'CUSTOM_DAYS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('FLUTTERWAVE');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER', 'FILL_BLANKS', 'MATCHING', 'ORDERING', 'MATH_PROBLEM', 'CODING', 'DIAGRAM');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GradingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "PortfolioItemType" AS ENUM ('ASSIGNMENT', 'PROJECT', 'ARTWORK', 'WRITING', 'VIDEO', 'AUDIO', 'PHOTO', 'PRESENTATION', 'RESEARCH', 'EXPERIMENT', 'FIELD_TRIP', 'REFLECTION', 'ACHIEVEMENT', 'CERTIFICATE');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('QUESTION', 'DISCUSSION', 'RESOURCE', 'SUCCESS_STORY', 'TIP', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "StandardStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'MASTERED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('THEORY', 'PRACTICE_EASY', 'PRACTICE_MEDIUM', 'PRACTICE_HARD', 'QUIZ', 'CHALLENGE', 'REVIEW');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "ModulePublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "password" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "parentId" TEXT,
    "createdById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "aiConfig" JSONB,
    "hasAdvancedStructure" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER,
    "totalMarks" INTEGER NOT NULL DEFAULT 100,
    "passingMarks" INTEGER NOT NULL DEFAULT 50,
    "autoPublishResults" BOOLEAN NOT NULL DEFAULT true,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "creatorId" TEXT NOT NULL,
    "instructions" TEXT,
    "allowedResources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_sections" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "totalMarks" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "sectionId" TEXT,
    "type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB NOT NULL,
    "imageUrl" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marks" INTEGER NOT NULL DEFAULT 5,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "difficulty" TEXT,
    "topic" TEXT,
    "explanation" TEXT,
    "gradingRubric" JSONB,
    "sampleAnswer" TEXT,
    "questionNumber" TEXT,
    "context" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "timeSpent" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isGraded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "submittedFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiScore" DOUBLE PRECISION,
    "aiFeedback" TEXT,
    "aiGradedAt" TIMESTAMP(3),
    "manualScore" DOUBLE PRECISION,
    "manualFeedback" TEXT,
    "reviewedBy" TEXT,
    "finalScore" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "grade" TEXT,
    "status" "GradingStatus" NOT NULL DEFAULT 'PENDING',
    "aiAnalysis" JSONB,
    "overallFeedback" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gradeLevel" INTEGER,
    "subject" TEXT,
    "teacherId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_students" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_assignments" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT,
    "classId" TEXT,
    "assignedBy" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "allowLateSubmission" BOOLEAN NOT NULL DEFAULT false,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "attemptsUsed" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PortfolioItemType" NOT NULL,
    "content" JSONB NOT NULL,
    "subject" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reflection" TEXT,
    "learningGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grade" TEXT,
    "feedback" TEXT,
    "assessedBy" TEXT,
    "assessedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parentId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_performance_data" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT,
    "skillLevel" INTEGER NOT NULL DEFAULT 1,
    "difficultyPreference" INTEGER NOT NULL DEFAULT 5,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "speed" DOUBLE PRECISION,
    "consistency" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "preferredQuestionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weaknesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastExamScore" DOUBLE PRECISION,
    "trending" TEXT NOT NULL DEFAULT 'STABLE',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_performance_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_standards" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_standard_progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "status" "StandardStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "masteredAt" TIMESTAMP(3),
    "lastAttempt" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_standard_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_plans" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "duration" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" TEXT,
    "estimatedTime" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_plan_assignments" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "studentId" TEXT,
    "classId" TEXT,
    "assignedBy" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "progress" JSONB,
    "studentNotes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_plan_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_modules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "topic" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "totalLessons" INTEGER NOT NULL DEFAULT 10,
    "passingScore" INTEGER NOT NULL DEFAULT 95,
    "livesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxLives" INTEGER NOT NULL DEFAULT 3,
    "createdBy" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 100,
    "badgeType" TEXT,
    "status" "ModulePublishStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_lessons" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "minScore" INTEGER NOT NULL DEFAULT 80,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "xpReward" INTEGER NOT NULL DEFAULT 10,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_steps" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "type" "StepType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "timeLimit" INTEGER,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTH',
    "billingDays" INTEGER DEFAULT 30,
    "examLimitPerPeriod" INTEGER NOT NULL DEFAULT 0,
    "studyModuleLimitPerPeriod" INTEGER NOT NULL DEFAULT 0,
    "maxAttemptsPerExam" INTEGER NOT NULL DEFAULT 1,
    "creatorExamCreateLimitPerPeriod" INTEGER NOT NULL DEFAULT 0,
    "creatorModuleCreateLimitPerPeriod" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "examsTakenThisPeriod" INTEGER NOT NULL DEFAULT 0,
    "modulesAccessedThisPeriod" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'FLUTTERWAVE',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "txRef" TEXT NOT NULL,
    "flwRef" TEXT,
    "raw" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_module_access" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_module_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_module_assignments" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "instructions" TEXT,
    "currentLesson" INTEGER NOT NULL DEFAULT 1,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "overallProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "lives" INTEGER NOT NULL DEFAULT 3,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "status" "ModuleStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_module_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_progress" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "currentLessonNumber" INTEGER NOT NULL DEFAULT 1,
    "currentStepNumber" INTEGER NOT NULL DEFAULT 1,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "livesRemaining" INTEGER NOT NULL DEFAULT 3,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completed_steps" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION NOT NULL,
    "timeSpent" INTEGER NOT NULL,

    CONSTRAINT "completed_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_step_progress" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "answers" JSONB NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_step_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxExams" INTEGER NOT NULL DEFAULT 10,
    "maxStudyModules" INTEGER NOT NULL DEFAULT 10,
    "maxStudents" INTEGER NOT NULL DEFAULT 50,
    "totalAttemptsPool" INTEGER NOT NULL DEFAULT 100,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTier" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "examsCreated" INTEGER NOT NULL DEFAULT 0,
    "studyModulesCreated" INTEGER NOT NULL DEFAULT 0,
    "studentsCreated" INTEGER NOT NULL DEFAULT 0,
    "attemptsUsed" INTEGER NOT NULL DEFAULT 0,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_QuestionStandards" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ExamStandards" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "exams_creatorId_idx" ON "exams"("creatorId");

-- CreateIndex
CREATE INDEX "exam_sections_examId_idx" ON "exam_sections"("examId");

-- CreateIndex
CREATE INDEX "questions_examId_idx" ON "questions"("examId");

-- CreateIndex
CREATE INDEX "exam_attempts_examId_studentId_idx" ON "exam_attempts"("examId", "studentId");

-- CreateIndex
CREATE INDEX "exam_attempts_studentId_idx" ON "exam_attempts"("studentId");

-- CreateIndex
CREATE INDEX "answers_attemptId_idx" ON "answers"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "grades_attemptId_key" ON "grades"("attemptId");

-- CreateIndex
CREATE INDEX "grades_studentId_idx" ON "grades"("studentId");

-- CreateIndex
CREATE INDEX "classes_teacherId_idx" ON "classes"("teacherId");

-- CreateIndex
CREATE INDEX "classes_createdById_idx" ON "classes"("createdById");

-- CreateIndex
CREATE INDEX "class_students_classId_idx" ON "class_students"("classId");

-- CreateIndex
CREATE INDEX "class_students_studentId_idx" ON "class_students"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "class_students_classId_studentId_key" ON "class_students"("classId", "studentId");

-- CreateIndex
CREATE INDEX "exam_assignments_examId_idx" ON "exam_assignments"("examId");

-- CreateIndex
CREATE INDEX "exam_assignments_studentId_idx" ON "exam_assignments"("studentId");

-- CreateIndex
CREATE INDEX "exam_assignments_classId_idx" ON "exam_assignments"("classId");

-- CreateIndex
CREATE INDEX "exam_assignments_assignedBy_idx" ON "exam_assignments"("assignedBy");

-- CreateIndex
CREATE UNIQUE INDEX "exam_assignments_examId_studentId_key" ON "exam_assignments"("examId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "portfolios_studentId_idx" ON "portfolios"("studentId");

-- CreateIndex
CREATE INDEX "portfolio_items_portfolioId_idx" ON "portfolio_items"("portfolioId");

-- CreateIndex
CREATE INDEX "community_posts_authorId_idx" ON "community_posts"("authorId");

-- CreateIndex
CREATE INDEX "community_posts_type_idx" ON "community_posts"("type");

-- CreateIndex
CREATE INDEX "community_posts_category_idx" ON "community_posts"("category");

-- CreateIndex
CREATE INDEX "post_likes_postId_idx" ON "post_likes"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_userId_postId_key" ON "post_likes"("userId", "postId");

-- CreateIndex
CREATE INDEX "student_performance_data_studentId_idx" ON "student_performance_data"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_performance_data_studentId_subject_key" ON "student_performance_data"("studentId", "subject");

-- CreateIndex
CREATE INDEX "curriculum_standards_country_system_idx" ON "curriculum_standards"("country", "system");

-- CreateIndex
CREATE INDEX "curriculum_standards_subject_gradeLevel_idx" ON "curriculum_standards"("subject", "gradeLevel");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_standards_country_system_code_key" ON "curriculum_standards"("country", "system", "code");

-- CreateIndex
CREATE INDEX "student_standard_progress_studentId_idx" ON "student_standard_progress"("studentId");

-- CreateIndex
CREATE INDEX "student_standard_progress_standardId_idx" ON "student_standard_progress"("standardId");

-- CreateIndex
CREATE UNIQUE INDEX "student_standard_progress_studentId_standardId_key" ON "student_standard_progress"("studentId", "standardId");

-- CreateIndex
CREATE INDEX "lesson_plans_createdBy_idx" ON "lesson_plans"("createdBy");

-- CreateIndex
CREATE INDEX "lesson_plans_subject_gradeLevel_idx" ON "lesson_plans"("subject", "gradeLevel");

-- CreateIndex
CREATE INDEX "lesson_plan_assignments_studentId_idx" ON "lesson_plan_assignments"("studentId");

-- CreateIndex
CREATE INDEX "lesson_plan_assignments_classId_idx" ON "lesson_plan_assignments"("classId");

-- CreateIndex
CREATE INDEX "lesson_plan_assignments_assignedBy_idx" ON "lesson_plan_assignments"("assignedBy");

-- CreateIndex
CREATE INDEX "study_modules_createdBy_idx" ON "study_modules"("createdBy");

-- CreateIndex
CREATE INDEX "study_modules_subject_gradeLevel_idx" ON "study_modules"("subject", "gradeLevel");

-- CreateIndex
CREATE INDEX "study_lessons_moduleId_idx" ON "study_lessons"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "study_lessons_moduleId_lessonNumber_key" ON "study_lessons"("moduleId", "lessonNumber");

-- CreateIndex
CREATE INDEX "study_steps_lessonId_idx" ON "study_steps"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "study_steps_lessonId_stepNumber_key" ON "study_steps"("lessonId", "stepNumber");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_tierId_idx" ON "subscriptions"("tierId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_txRef_key" ON "payments"("txRef");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "subscription_module_access_subscriptionId_idx" ON "subscription_module_access"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_module_access_subscriptionId_moduleId_key" ON "subscription_module_access"("subscriptionId", "moduleId");

-- CreateIndex
CREATE INDEX "study_module_assignments_studentId_idx" ON "study_module_assignments"("studentId");

-- CreateIndex
CREATE INDEX "study_module_assignments_assignedBy_idx" ON "study_module_assignments"("assignedBy");

-- CreateIndex
CREATE UNIQUE INDEX "study_module_assignments_moduleId_studentId_key" ON "study_module_assignments"("moduleId", "studentId");

-- CreateIndex
CREATE INDEX "study_progress_studentId_idx" ON "study_progress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "study_progress_moduleId_studentId_key" ON "study_progress"("moduleId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "completed_steps_progressId_lessonId_stepNumber_key" ON "completed_steps"("progressId", "lessonId", "stepNumber");

-- CreateIndex
CREATE INDEX "student_step_progress_stepId_idx" ON "student_step_progress"("stepId");

-- CreateIndex
CREATE INDEX "student_step_progress_studentId_idx" ON "student_step_progress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Tier_name_key" ON "Tier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserTier_userId_key" ON "UserTier"("userId");

-- CreateIndex
CREATE INDEX "UserTier_userId_idx" ON "UserTier"("userId");

-- CreateIndex
CREATE INDEX "UserTier_tierId_idx" ON "UserTier"("tierId");

-- CreateIndex
CREATE UNIQUE INDEX "_QuestionStandards_AB_unique" ON "_QuestionStandards"("A", "B");

-- CreateIndex
CREATE INDEX "_QuestionStandards_B_index" ON "_QuestionStandards"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ExamStandards_AB_unique" ON "_ExamStandards"("A", "B");

-- CreateIndex
CREATE INDEX "_ExamStandards_B_index" ON "_ExamStandards"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "community_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_performance_data" ADD CONSTRAINT "student_performance_data_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_standard_progress" ADD CONSTRAINT "student_standard_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_standard_progress" ADD CONSTRAINT "student_standard_progress_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "curriculum_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plan_assignments" ADD CONSTRAINT "lesson_plan_assignments_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "lesson_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plan_assignments" ADD CONSTRAINT "lesson_plan_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plan_assignments" ADD CONSTRAINT "lesson_plan_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plan_assignments" ADD CONSTRAINT "lesson_plan_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_modules" ADD CONSTRAINT "study_modules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_lessons" ADD CONSTRAINT "study_lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "study_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_steps" ADD CONSTRAINT "study_steps_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "study_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "subscription_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_module_access" ADD CONSTRAINT "subscription_module_access_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_module_assignments" ADD CONSTRAINT "study_module_assignments_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "study_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_module_assignments" ADD CONSTRAINT "study_module_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_module_assignments" ADD CONSTRAINT "study_module_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_progress" ADD CONSTRAINT "study_progress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "study_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_progress" ADD CONSTRAINT "study_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_steps" ADD CONSTRAINT "completed_steps_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "study_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_steps" ADD CONSTRAINT "completed_steps_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "study_lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_step_progress" ADD CONSTRAINT "student_step_progress_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "study_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_step_progress" ADD CONSTRAINT "student_step_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTier" ADD CONSTRAINT "UserTier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTier" ADD CONSTRAINT "UserTier_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "Tier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuestionStandards" ADD CONSTRAINT "_QuestionStandards_A_fkey" FOREIGN KEY ("A") REFERENCES "curriculum_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuestionStandards" ADD CONSTRAINT "_QuestionStandards_B_fkey" FOREIGN KEY ("B") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExamStandards" ADD CONSTRAINT "_ExamStandards_A_fkey" FOREIGN KEY ("A") REFERENCES "curriculum_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExamStandards" ADD CONSTRAINT "_ExamStandards_B_fkey" FOREIGN KEY ("B") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
