-- AlterTable
ALTER TABLE "admin_modules" ADD COLUMN     "materialUrl" TEXT;

-- DropEnum
DROP TYPE "QuestionSource";
