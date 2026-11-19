-- CreateTable
CREATE TABLE "SnapshotReference" (
    "snapshotId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "SnapshotReference_pkey" PRIMARY KEY ("snapshotId","key")
);

-- AddForeignKey
ALTER TABLE "SnapshotReference" ADD CONSTRAINT "SnapshotReference_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DataSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
