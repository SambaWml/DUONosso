-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "endPage" INTEGER,
ADD COLUMN     "startPage" INTEGER;

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "filePath" TEXT;
