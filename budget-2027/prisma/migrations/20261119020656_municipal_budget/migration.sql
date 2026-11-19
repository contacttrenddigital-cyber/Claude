-- CreateTable
CREATE TABLE "MunicipalBudget" (
    "snapshotId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "populationAsOf" DATE NOT NULL,
    "y2027" JSONB NOT NULL,
    "y2026" JSONB NOT NULL,
    "perCapita2027" DECIMAL(14,2) NOT NULL,
    "perCapita2026" DECIMAL(14,2) NOT NULL,
    "billLocator" TEXT NOT NULL,

    CONSTRAINT "MunicipalBudget_pkey" PRIMARY KEY ("snapshotId","code")
);

-- AddForeignKey
ALTER TABLE "MunicipalBudget" ADD CONSTRAINT "MunicipalBudget_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DataSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
