-- AlterTable
ALTER TABLE "Tier" ADD COLUMN     "totalAttemptsPool" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "UserTier" ADD COLUMN     "attemptsUsed" INTEGER NOT NULL DEFAULT 0;
