-- CreateEnum
CREATE TYPE "Scope" AS ENUM ('STATE_BUDGET', 'KFP', 'KFP_EXCL_EU_CONTRIBUTION', 'DCO', 'NHIF', 'MUNICIPAL', 'EU_FUNDS', 'GENERAL_GOVERNMENT_ESA', 'MINISTRY', 'PROGRAM');

-- CreateEnum
CREATE TYPE "FigureStatus" AS ENUM ('DRAFT', 'LAW', 'REPORT', 'EXPECTED', 'FORECAST', 'PARTIAL', 'PENDING');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('TRUE', 'MOSTLY_TRUE', 'MISLEADING', 'FALSE', 'UNVERIFIABLE');

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "homepage" TEXT NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "publishedOn" DATE,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "legalStatus" TEXT,

    CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "asOf" DATE NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Figure" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DECIMAL(24,6),
    "unit" TEXT NOT NULL,
    "scope" "Scope" NOT NULL,
    "status" "FigureStatus" NOT NULL,
    "period" TEXT NOT NULL,
    "asOf" DATE NOT NULL,
    "documentId" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "sigmaRecord" TEXT,
    "releaseId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "municipalityId" TEXT,

    CONSTRAINT "Figure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameBg" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "population" INTEGER,
    "populationAsOf" DATE,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "saidOn" DATE NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "verdict" "Verdict",
    "reasoning" TEXT,
    "reviewedBy" TEXT,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimFigure" (
    "claimId" TEXT NOT NULL,
    "figureId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "ClaimFigure_pkey" PRIMARY KEY ("claimId","figureId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_name_key" ON "Publisher"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SourceDocument_sha256_key" ON "SourceDocument"("sha256");

-- CreateIndex
CREATE INDEX "SourceDocument_url_idx" ON "SourceDocument"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Release_source_version_key" ON "Release"("source", "version");

-- CreateIndex
CREATE INDEX "Figure_scope_period_idx" ON "Figure"("scope", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Figure_key_period_status_documentId_key" ON "Figure"("key", "period", "status", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_code_key" ON "Municipality"("code");

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Figure" ADD CONSTRAINT "Figure_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SourceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Figure" ADD CONSTRAINT "Figure_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Figure" ADD CONSTRAINT "Figure_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimFigure" ADD CONSTRAINT "ClaimFigure_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimFigure" ADD CONSTRAINT "ClaimFigure_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "Figure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
