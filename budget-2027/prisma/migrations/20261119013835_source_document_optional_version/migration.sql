-- DropForeignKey
ALTER TABLE "SourceDocument" DROP CONSTRAINT "SourceDocument_versionId_fkey";

-- AlterTable
ALTER TABLE "SourceDocument" ALTER COLUMN "versionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "BudgetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
