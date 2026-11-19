-- CreateTable
CREATE TABLE "DataTable" (
    "snapshotId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "DataTable_pkey" PRIMARY KEY ("snapshotId","id")
);

-- AddForeignKey
ALTER TABLE "DataTable" ADD CONSTRAINT "DataTable_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DataSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
