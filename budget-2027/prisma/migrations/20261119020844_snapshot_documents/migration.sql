-- CreateTable
CREATE TABLE "SnapshotDocument" (
    "snapshotId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "SnapshotDocument_pkey" PRIMARY KEY ("snapshotId","documentId")
);

-- AddForeignKey
ALTER TABLE "SnapshotDocument" ADD CONSTRAINT "SnapshotDocument_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DataSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotDocument" ADD CONSTRAINT "SnapshotDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SourceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
