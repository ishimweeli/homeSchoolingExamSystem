/*
  Warnings:

  - Changed the type of `status` on the `memberships` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE memberships
ALTER COLUMN status TYPE "MembershipStatus"
USING status::text::"MembershipStatus";
