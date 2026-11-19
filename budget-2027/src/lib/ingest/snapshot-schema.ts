/** Zod schema of a published data snapshot (data/snapshots/<id>.json). */
import { z } from "zod";

export const SNAPSHOT_SCHEMA_VERSION = 1;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dec = z.string().regex(/^-?\d+(\.\d+)?$/);
const vintage = z.enum(["actual", "expected", "plan", "draft", "forecast"]);

const Cell = z.object({ value: dec.nullable(), text: z.string() });
export const TableSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  caption: z.string(),
  scope: z.string(),
  basis: z.string(),
  documentId: z.string(),
  file: z.string(),
  tableIndex: z.number(),
  columns: z.array(z.object({ key: z.string(), col: z.number(), label: z.string(), period: z.string(), vintage, unit: z.string() })),
  textColumns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(
    z.object({
      label: z.string(),
      level: z.number(),
      kind: z.enum(["data", "group", "total"]),
      group: z.string().nullable(),
      cells: z.record(z.string(), Cell),
      texts: z.record(z.string(), z.string()).optional(),
      rowIndex: z.number(),
    }),
  ),
});
export type TableData = z.infer<typeof TableSchema>;

export const SnapshotSchema = z.object({
  schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  id: z.string().regex(/^snap-[a-f0-9]{16}$/),
  createdAt: z.string(),
  retrievedOn: date,
  sigma: z.object({ dataVersion: z.string(), catalogDatasets: z.number(), mockDatasets: z.number() }),
  versions: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      stage: z.enum(["PUBLIC_DRAFT", "SUBMITTED_BILL", "COMMITTEE", "FIRST_READING", "SECOND_READING", "ENACTED", "PROMULGATED"]),
      date,
      legalStatus: z.string(),
      evidence: z.string(),
    }),
  ),
  documents: z.array(
    z.object({
      id: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      bytes: z.number(),
      publisher: z.string(),
      title: z.string(),
      url: z.string().url(),
      pageUrl: z.string().url().nullable(),
      mime: z.string(),
      retrievedOn: date,
      publishedOn: date.nullable(),
      legalStatus: z.string().nullable(),
      versionId: z.string(),
    }),
  ),
  metrics: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      short: z.string(),
      definition: z.string(),
      scope: z.string(),
      basis: z.string(),
      unit: z.string(),
      changeIn: z.enum(["percent", "pp"]),
    }),
  ),
  observations: z.array(
    z.object({
      metricKey: z.string(),
      versionId: z.string(),
      period: z.string(),
      vintage,
      value: dec.nullable(),
      unit: z.string(),
      review: z.enum(["cross_checked", "single_source", "conflict"]),
      sources: z.array(
        z.object({ documentId: z.string(), locator: z.string(), value: dec.nullable(), original: z.string().nullable() }),
      ),
    }),
  ),
  measures: z.array(
    z.object({
      id: z.string(),
      versionId: z.string(),
      direction: z.enum(["revenue", "expenditure"]),
      title: z.string(),
      effects: z.record(z.string(), dec.nullable()),
      unit: z.literal("млн. €"),
      basis: z.literal("accrual"),
      documentId: z.string(),
      locator: z.string(),
    }),
  ),
  versionDiffs: z.array(
    z.object({ label: z.string(), period: z.string(), before: dec.nullable(), after: dec.nullable(), difference: dec.nullable() }),
  ),
  checks: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["cross-source", "identity", "total", "version-diff"]),
      status: z.enum(["pass", "fail", "warn"]),
      description: z.string(),
      details: z.record(z.string(), z.string().nullable()).optional(),
    }),
  ),
  tables: z.array(TableSchema),
  legislativeEvents: z.array(
    z.object({ id: z.string(), date, type: z.string(), title: z.string(), documentId: z.string(), note: z.string().nullable() }),
  ),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;
