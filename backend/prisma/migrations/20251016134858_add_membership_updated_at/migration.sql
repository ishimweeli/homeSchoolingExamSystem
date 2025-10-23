/*
  Warnings:

  - Added the required column `updatedAt` to the `Membership` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Membership` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "Membership_userId_orgId_key";

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;
