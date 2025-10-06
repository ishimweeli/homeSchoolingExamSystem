-- CreateEnum
CREATE TYPE "ModulePublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "study_modules" ADD COLUMN     "status" "ModulePublishStatus" NOT NULL DEFAULT 'PUBLISHED';
