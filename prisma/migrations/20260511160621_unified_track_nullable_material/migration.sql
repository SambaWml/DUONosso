-- DropForeignKey
ALTER TABLE "learning_paths" DROP CONSTRAINT "learning_paths_materialId_fkey";

-- AlterTable
ALTER TABLE "learning_paths" ALTER COLUMN "materialId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
