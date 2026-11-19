/*
  Warnings:

  - You are about to drop the column `publishedAt` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `excerpt` on the `PoliticalStatement` table. All the data in the column will be lost.
  - You are about to drop the column `saidAt` on the `PoliticalStatement` table. All the data in the column will be lost.
  - You are about to drop the column `timecode` on the `PoliticalStatement` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `PoliticalStatement` table. All the data in the column will be lost.
  - Added the required column `figures` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kind` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ordinal` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quote` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reviewedOn` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topic` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Made the column `reasoning` on table `Claim` required. This step will fail if there are existing NULL values in that column.
  - Made the column `reviewedBy` on table `Claim` required. This step will fail if there are existing NULL values in that column.
  - Made the column `verdict` on table `Claim` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `budgetVersion` to the `PoliticalStatement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saidOn` to the `PoliticalStatement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `PoliticalStatement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Claim" DROP COLUMN "publishedAt",
DROP COLUMN "text",
ADD COLUMN     "calculation" JSONB,
ADD COLUMN     "context" TEXT,
ADD COLUMN     "figures" JSONB NOT NULL,
ADD COLUMN     "governmentPosition" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL,
ADD COLUMN     "ordinal" INTEGER NOT NULL,
ADD COLUMN     "quote" TEXT NOT NULL,
ADD COLUMN     "reviewedOn" DATE NOT NULL,
ADD COLUMN     "topic" TEXT NOT NULL,
ALTER COLUMN "reasoning" SET NOT NULL,
ALTER COLUMN "reviewedBy" SET NOT NULL,
ALTER COLUMN "verdict" SET NOT NULL;

-- AlterTable
ALTER TABLE "PoliticalStatement" DROP COLUMN "excerpt",
DROP COLUMN "saidAt",
DROP COLUMN "timecode",
DROP COLUMN "url",
ADD COLUMN     "budgetVersion" TEXT NOT NULL,
ADD COLUMN     "documentIds" TEXT[],
ADD COLUMN     "saidOn" DATE NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
