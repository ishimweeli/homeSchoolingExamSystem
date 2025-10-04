-- DropIndex
DROP INDEX "exam_attempts_examId_studentId_key";

-- CreateIndex
CREATE INDEX "exam_attempts_examId_studentId_idx" ON "exam_attempts"("examId", "studentId");
