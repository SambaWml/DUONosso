-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('AI', 'ADMIN');

-- AlterTable
ALTER TABLE "learning_modules" ADD COLUMN     "adminModuleId" TEXT,
ALTER COLUMN "chapterId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "simulation_answers" ADD COLUMN     "adminQuestionId" TEXT,
ALTER COLUMN "questionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "admin_modules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ctflChapter" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_questions" (
    "id" TEXT NOT NULL,
    "adminModuleId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "imageUrl" TEXT,
    "alternativeA" TEXT NOT NULL,
    "alternativeB" TEXT NOT NULL,
    "alternativeC" TEXT NOT NULL,
    "alternativeD" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "explanationA" TEXT,
    "explanationB" TEXT,
    "explanationC" TEXT,
    "explanationD" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "syllabusRef" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_modules_ctflChapter_orderIndex_idx" ON "admin_modules"("ctflChapter", "orderIndex");

-- CreateIndex
CREATE INDEX "admin_questions_adminModuleId_orderIndex_idx" ON "admin_questions"("adminModuleId", "orderIndex");

-- AddForeignKey
ALTER TABLE "simulation_answers" ADD CONSTRAINT "simulation_answers_adminQuestionId_fkey" FOREIGN KEY ("adminQuestionId") REFERENCES "admin_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_questions" ADD CONSTRAINT "admin_questions_adminModuleId_fkey" FOREIGN KEY ("adminModuleId") REFERENCES "admin_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_adminModuleId_fkey" FOREIGN KEY ("adminModuleId") REFERENCES "admin_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
