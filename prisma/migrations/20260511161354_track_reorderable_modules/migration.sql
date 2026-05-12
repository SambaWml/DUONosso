-- DropIndex
DROP INDEX "learning_modules_pathId_orderIndex_key";

-- CreateIndex
CREATE INDEX "learning_modules_pathId_orderIndex_idx" ON "learning_modules"("pathId", "orderIndex");
