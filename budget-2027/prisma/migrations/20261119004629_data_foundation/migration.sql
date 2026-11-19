/*
  Warnings:

  - You are about to drop the column `saidOn` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `speaker` on the `Claim` table. All the data in the column will be lost.
  - The `verdict` column on the `Claim` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `mimeType` on the `SourceDocument` table. All the data in the column will be lost.
  - You are about to drop the column `publisherId` on the `SourceDocument` table. All the data in the column will be lost.
  - You are about to drop the column `retrievedAt` on the `SourceDocument` table. All the data in the column will be lost.
  - You are about to drop the `ClaimFigure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Figure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Publisher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Release` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `statementId` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bytes` to the `SourceDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mime` to the `SourceDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publisher` to the `SourceDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `retrievedOn` to the `SourceDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `versionId` to the `SourceDocument` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VersionStage" AS ENUM ('PUBLIC_DRAFT', 'SUBMITTED_BILL', 'COMMITTEE', 'FIRST_READING', 'SECOND_READING', 'ENACTED', 'PROMULGATED');

-- CreateEnum
CREATE TYPE "Vintage" AS ENUM ('actual', 'expected', 'plan', 'draft', 'forecast');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('cross_checked', 'single_source', 'conflict', 'editor_approved');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('pass', 'warn', 'fail');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('viewer', 'researcher', 'editor', 'publisher', 'administrator');

-- DropForeignKey
ALTER TABLE "ClaimFigure" DROP CONSTRAINT "ClaimFigure_claimId_fkey";

-- DropForeignKey
ALTER TABLE "ClaimFigure" DROP CONSTRAINT "ClaimFigure_figureId_fkey";

-- DropForeignKey
ALTER TABLE "Figure" DROP CONSTRAINT "Figure_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Figure" DROP CONSTRAINT "Figure_municipalityId_fkey";

-- DropForeignKey
ALTER TABLE "Figure" DROP CONSTRAINT "Figure_releaseId_fkey";

-- DropForeignKey
ALTER TABLE "SourceDocument" DROP CONSTRAINT "SourceDocument_publisherId_fkey";

-- DropIndex
DROP INDEX "SourceDocument_sha256_key";

-- DropIndex
DROP INDEX "SourceDocument_url_idx";

-- AlterTable
ALTER TABLE "Claim" DROP COLUMN "saidOn",
DROP COLUMN "sourceUrl",
DROP COLUMN "speaker",
ADD COLUMN     "statementId" TEXT NOT NULL,
DROP COLUMN "verdict",
ADD COLUMN     "verdict" TEXT;

-- AlterTable
ALTER TABLE "SourceDocument" DROP COLUMN "mimeType",
DROP COLUMN "publisherId",
DROP COLUMN "retrievedAt",
ADD COLUMN     "bytes" INTEGER NOT NULL,
ADD COLUMN     "mime" TEXT NOT NULL,
ADD COLUMN     "pageUrl" TEXT,
ADD COLUMN     "publisher" TEXT NOT NULL,
ADD COLUMN     "retrievedOn" DATE NOT NULL,
ADD COLUMN     "versionId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ClaimFigure";

-- DropTable
DROP TABLE "Figure";

-- DropTable
DROP TABLE "Publisher";

-- DropTable
DROP TABLE "Release";

-- DropEnum
DROP TYPE "FigureStatus";

-- DropEnum
DROP TYPE "Scope";

-- DropEnum
DROP TYPE "Verdict";

-- CreateTable
CREATE TABLE "BudgetVersion" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "stage" "VersionStage" NOT NULL,
    "date" DATE NOT NULL,
    "legalStatus" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,

    CONSTRAINT "BudgetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "log" TEXT NOT NULL DEFAULT '',
    "snapshotId" TEXT,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "retrievedOn" DATE NOT NULL,
    "sigmaVersion" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "DataSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "changeIn" TEXT NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MetricObservation" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "vintage" "Vintage" NOT NULL,
    "value" DECIMAL(24,6),
    "unit" TEXT NOT NULL,
    "review" "ReviewStatus" NOT NULL,

    CONSTRAINT "MetricObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObservationSource" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "locator" TEXT NOT NULL,
    "value" DECIMAL(24,6),
    "original" TEXT,

    CONSTRAINT "ObservationSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetMeasure" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "effect2027" DECIMAL(24,6),
    "effect2028" DECIMAL(24,6),
    "effect2029" DECIMAL(24,6),
    "unit" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "locator" TEXT NOT NULL,

    CONSTRAINT "BudgetMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationCheck" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "CheckStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "ValidationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionDiff" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "before" DECIMAL(24,6),
    "after" DECIMAL(24,6),
    "difference" DECIMAL(24,6),

    CONSTRAINT "VersionDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegislativeEvent" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "LegislativeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliticalStatement" (
    "id" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "saidAt" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "timecode" TEXT,
    "excerpt" TEXT NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "PoliticalStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimEvidence" (
    "claimId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "ClaimEvidence_pkey" PRIMARY KEY ("claimId","observationId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricObservation_metricKey_period_idx" ON "MetricObservation"("metricKey", "period");

-- CreateIndex
CREATE UNIQUE INDEX "MetricObservation_snapshotId_metricKey_versionId_period_key" ON "MetricObservation"("snapshotId", "metricKey", "versionId", "period");

-- CreateIndex
CREATE INDEX "BudgetMeasure_snapshotId_direction_idx" ON "BudgetMeasure"("snapshotId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationCheck_snapshotId_checkId_key" ON "ValidationCheck"("snapshotId", "checkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SourceDocument_sha256_idx" ON "SourceDocument"("sha256");

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "BudgetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DataSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricObservation" ADD CONSTRAINT "MetricObservation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DataSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricObservation" ADD CONSTRAINT "MetricObservation_metricKey_fkey" FOREIGN KEY ("metricKey") REFERENCES "Metric"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricObservation" ADD CONSTRAINT "MetricObservation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "BudgetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservationSource" ADD CONSTRAINT "ObservationSource_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "MetricObservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservationSource" ADD CONSTRAINT "ObservationSource_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SourceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetMeasure" ADD CONSTRAINT "BudgetMeasure_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DataSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetMeasure" ADD CONSTRAINT "BudgetMeasure_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "BudgetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetMeasure" ADD CONSTRAINT "BudgetMeasure_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SourceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCheck" ADD CONSTRAINT "ValidationCheck_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DataSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionDiff" ADD CONSTRAINT "VersionDiff_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DataSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegislativeEvent" ADD CONSTRAINT "LegislativeEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SourceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "PoliticalStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEvidence" ADD CONSTRAINT "ClaimEvidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEvidence" ADD CONSTRAINT "ClaimEvidence_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "MetricObservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
