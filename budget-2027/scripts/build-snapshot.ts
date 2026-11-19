/**
 * Build an immutable data snapshot for the 2027 budget from official documents + SIGMA.
 *
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/build-snapshot.ts
 *
 * Steps: verify raw file hashes → extract observations with locators → cross-source checks →
 * accounting identities → measures → SIGMA (06.11 draft) comparison → write
 * data/snapshots/<id>.json. Exits non-zero if any check FAILS; nothing is written then.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DocxExtract, EmfTableExtract } from "../src/lib/ingest/documents";
import {
  diffRows,
  extractMeasures,
  extractObservations,
  identityChecks,
  type Observation,
} from "../src/lib/ingest/snapshot";
import { METRICS } from "../src/lib/metrics/catalog";
import { createSigmaClient } from "../src/lib/sigma/client";
import { SNAPSHOT_SCHEMA_VERSION, type Snapshot } from "../src/lib/ingest/snapshot-schema";

const ROOT = join(__dirname, "..");
const RAW = join(ROOT, "data/raw");
const RETRIEVED = process.env.RETRIEVED_ON ?? "2026-11-19";

const sha256 = (buf: Buffer | string) => createHash("sha256").update(buf).digest("hex");

function fileDoc(id: string, path: string, meta: Omit<Snapshot["documents"][number], "id" | "sha256" | "bytes">) {
  const full = join(RAW, path);
  if (!existsSync(full)) throw new Error(`Missing raw file ${full}. See docs/SOURCE_INVENTORY.md for download steps.`);
  const buf = readFileSync(full);
  return { id, sha256: sha256(buf), bytes: buf.length, ...meta };
}

async function main() {
  const versionId = "bill-2026-11-16";
  const documents: Snapshot["documents"] = [
    fileDoc("ns-52-602-01-71-docx", "parliament/52-602-01-71.docx", {
      publisher: "Народно събрание",
      title: "Законопроект за държавния бюджет на Република България за 2027 г. с мотиви (АСБП 2027–2029), вх. № 52-602-01-71",
      url: "https://www.parliament.bg/bills/52/52-602-01-71.docx",
      pageUrl: "https://www.parliament.bg/bg/bills/ID/167645",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      retrievedOn: RETRIEVED,
      publishedOn: "2026-11-16",
      legalStatus: "законопроект, внесен от Министерския съвет",
      versionId,
    }),
    fileDoc("ns-52-602-01-71-zip", "parliament/52-602-01-71.zip", {
      publisher: "Народно събрание",
      title: "Приложения към законопроекта: програмни бюджети на ведомствата, становища, протокол с НСОРБ",
      url: "https://www.parliament.bg/bills/52/52-602-01-71.zip",
      pageUrl: "https://www.parliament.bg/bg/bills/ID/167645",
      mime: "application/zip",
      retrievedOn: RETRIEVED,
      publishedOn: "2026-11-16",
      legalStatus: "приложения към законопроект",
      versionId,
    }),
    fileDoc("ns-52-602-01-68-rtf", "parliament/52-602-01-68.rtf", {
      publisher: "Народно събрание",
      title: "Законопроект за бюджета на Държавното обществено осигуряване за 2027 г., вх. № 52-602-01-68",
      url: "https://www.parliament.bg/bills/52/52-602-01-68.rtf",
      pageUrl: "https://www.parliament.bg/bg/bills/ID/167642",
      mime: "application/rtf",
      retrievedOn: RETRIEVED,
      publishedOn: "2026-11-16",
      legalStatus: "законопроект",
      versionId,
    }),
    fileDoc("ns-52-602-01-70-rtf", "parliament/52-602-01-70.rtf", {
      publisher: "Народно събрание",
      title: "Законопроект за бюджета на Националната здравноосигурителна каса за 2027 г., вх. № 52-602-01-70",
      url: "https://www.parliament.bg/bills/52/52-602-01-70.rtf",
      pageUrl: "https://www.parliament.bg/bg/bills/ID/167644",
      mime: "application/rtf",
      retrievedOn: RETRIEVED,
      publishedOn: "2026-11-16",
      legalStatus: "законопроект",
      versionId,
    }),
    fileDoc("ns-api-bill-167645", "parliament/bill_167645.json", {
      publisher: "Народно събрание",
      title: "Публично API на НС: метаданни за законопроект 52-602-01-71 (дата, комисии, файлове)",
      url: "https://www.parliament.bg/api/v1/bill/167645",
      pageUrl: "https://www.parliament.bg/bg/bills/ID/167645",
      mime: "application/json",
      retrievedOn: RETRIEVED,
      publishedOn: null,
      legalStatus: null,
      versionId,
    }),
    fileDoc("ms-2026-11-16", "government/ms-2026-11-16.html", {
      publisher: "Министерски съвет",
      title: "Заседание на Министерския съвет на 16.11.2026 г. — одобряване на проекта на ЗДБРБ 2027",
      url: "https://www.government.bg/bg/prestsentar/zasedaniya-na-ms/dneven-red-na-zasedanie-na-ministerskiya-savet-na-16-11-2026-g",
      pageUrl: null,
      mime: "text/html",
      retrievedOn: RETRIEVED,
      publishedOn: "2026-11-16",
      legalStatus: null,
      versionId,
    }),
  ];

  // Extracts must belong to the exact raw file we hashed
  const docx = DocxExtract.parse(JSON.parse(readFileSync(join(ROOT, "data/extracted/52-602-01-71.tables.json"), "utf8")));
  const annex3 = EmfTableExtract.parse(JSON.parse(readFileSync(join(ROOT, "data/extracted/52-602-01-71.annex3.json"), "utf8")));
  if (docx.sha256 !== documents[0]!.sha256) throw new Error("tables.json was extracted from a different DOCX");

  const inputs = { versionId, docx, annex3, docxId: documents[0]!.id };
  const { observations, checks } = extractObservations(inputs);
  checks.push(...identityChecks(observations));
  const m = extractMeasures(inputs, { revenueTable: 19, expenditureTable: 20 });
  checks.push(...m.checks);

  // ── SIGMA: the MoF draft published on 06.11.2026, as presented by SIGMA ──
  const sigma = createSigmaClient();
  const cat = await sigma.catalog();
  const sigmaDir = join(RAW, "sigma", cat.meta.asOf);
  mkdirSync(sigmaDir, { recursive: true });
  const sigmaFiles: Record<string, unknown> = {};
  for (const slug of ["budget2027", "outlook", "expenditure", "revenue"]) {
    const r = await sigma.dataset(slug);
    const text = JSON.stringify(r.data);
    writeFileSync(join(sigmaDir, `${slug}.json`), text);
    sigmaFiles[slug] = r.data;
    documents.push({
      id: `sigma-${slug}-${cat.meta.asOf}`,
      sha256: sha256(text),
      bytes: Buffer.byteLength(text),
      publisher: "СИГМА Бюджет (вторичен източник)",
      title: `СИГМА: ${r.meta.title} (данни към ${r.meta.asOf}; ${r.meta.sourceNote ?? ""})`.trim(),
      url: r.fileUrl,
      pageUrl: `https://sigma-budget.midt.bg/danni/${slug}`,
      mime: "application/json",
      retrievedOn: RETRIEVED,
      publishedOn: r.meta.asOf,
      legalStatus: "производен набор; първичният документ на МФ от 06.11.2026 не е достъпен за автоматично изтегляне",
      versionId: "mf-draft-2026-11-06",
    });
  }

  type SigmaRow = { label: string; cell?: { value: number | null } };
  const exp = sigmaFiles.expenditure as { byPeriod: Record<string, { rows: SigmaRow[] }> };
  const rev = sigmaFiles.revenue as { byPeriod?: Record<string, { rows: SigmaRow[] }> };
  const toStr = (v: number | null | undefined) => (v === null || v === undefined ? null : String(v));
  const sigmaRows = [
    ...(rev.byPeriod?.["2027.draft"]?.rows ?? []).map((r) => ({ ...r, dataset: "revenue" })),
    ...(exp.byPeriod["2027.draft"]?.rows ?? []).map((r) => ({ ...r, dataset: "expenditure" })),
  ].map((r) => ({ label: r.label, value: toStr(r.cell?.value), dataset: r.dataset }));
  const billRows = annex3.pages
    .filter((p) => p.page <= 2)
    .flatMap((p) => p.rows.map((r) => ({ label: r.label, value: r.cells["2027"] ? r.cells["2027"].text : null })))
    .map((r) => ({ label: r.label, value: r.value === null ? null : r.value.replace(/ /g, "").replace(",", ".") }));
  const versionDiffs = diffRows(sigmaRows, billRows, "2027");
  const compared = billRows.filter((b) => sigmaRows.some((s) => s.label.trim() === b.label.trim())).length;
  checks.push({
    id: "vdiff:annex3-2027:mf-draft-2026-11-06→bill-2026-11-16",
    kind: "version-diff",
    status: "warn",
    description: `Приложение № 3, 2027: сравнени ${compared} реда между проекта от 06.11 (по СИГМА) и внесения на 16.11; различават се ${versionDiffs.length}`,
  });

  // Observations for the 06.11 draft, only where SIGMA prints the same KFP row
  const draftObs: Observation[] = [];
  for (const def of METRICS.filter((d) => d.sources[0]!.kind === "annex3" && (d.sources[0] as { page: number }).page <= 2)) {
    const label = (def.sources[0] as { label: string }).label;
    const row = sigmaRows.find((r) => r.label.trim() === label);
    if (!row) continue;
    draftObs.push({
      metricKey: def.key,
      versionId: "mf-draft-2026-11-06",
      period: "2027",
      vintage: "draft",
      value: row.value,
      unit: def.unit,
      review: "single_source",
      sources: [
        {
          documentId: `sigma-${row.dataset}-${cat.meta.asOf}`,
          locator: `СИГМА, byPeriod["2027.draft"], ред „${label}“ (Приложение № 3 по публикацията на МФ от 06.11.2026)`,
          value: row.value,
          original: row.value,
        },
      ],
    });
  }

  const failed = checks.filter((c) => c.status === "fail");
  const content = { observations: [...observations, ...draftObs], measures: m.measures, versionDiffs };
  const id = `snap-${sha256(JSON.stringify(content)).slice(0, 16)}`;
  const snapshot: Snapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    id,
    createdAt: new Date().toISOString(),
    retrievedOn: RETRIEVED,
    sigma: { dataVersion: cat.meta.asOf, catalogDatasets: cat.counts.datasets, mockDatasets: cat.counts.mock },
    versions: [
      {
        id: "mf-draft-2026-11-06",
        label: "Проект на МФ, публикуван за обществено обсъждане",
        stage: "PUBLIC_DRAFT",
        date: "2026-11-06",
        legalStatus: "проект на Министерството на финансите",
        evidence: "СИГМА Бюджет, набор budget2027: „МФ, публикация от 06.11.2026“. Страницата на МФ е зад защита, която не позволява автоматично изтегляне.",
      },
      {
        id: versionId,
        label: "Законопроект, внесен в Народното събрание",
        stage: "SUBMITTED_BILL",
        date: "2026-11-16",
        legalStatus: "законопроект — не е приет",
        evidence: "НС, вх. № 52-602-01-71 от 16.11.2026 г., 11:24 ч.; Решение № 868 на МС от 2026 г.",
      },
    ],
    documents,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metrics: METRICS.map(({ sources: _s, ...rest }) => rest),
    observations: content.observations,
    measures: content.measures,
    versionDiffs,
    checks,
    legislativeEvents: [
      {
        id: "ev-2026-07-24-zdb2026",
        date: "2026-07-24",
        type: "ENACTED",
        title: "Народното събрание приема Закона за държавния бюджет за 2026 г.",
        documentId: "ms-2026-11-16",
        note: "По текста на Министерския съвет от 16.11.2026 г.",
      },
      {
        id: "ev-2026-11-06-draft",
        date: "2026-11-06",
        type: "PUBLIC_DRAFT",
        title: "МФ публикува проекта на бюджет 2027 и АСБП 2027–2029",
        documentId: `sigma-budget2027-${cat.meta.asOf}`,
        note: "Датата е по СИГМА; първичната страница на МФ не беше достъпна за автоматична проверка.",
      },
      {
        id: "ev-2026-11-16-ms",
        date: "2026-11-16",
        type: "GOVERNMENT_APPROVAL",
        title: "Министерският съвет одобрява законопроекта и АСБП 2027–2029 (Решение № 868)",
        documentId: "ms-2026-11-16",
        note: null,
      },
      {
        id: "ev-2026-11-16-filed",
        date: "2026-11-16",
        type: "SUBMITTED",
        title: "Законопроектът е внесен в Народното събрание, вх. № 52-602-01-71",
        documentId: "ns-api-bill-167645",
        note: "Водеща: Комисия по бюджет и финанси. Разпределен общо на 24 комисии.",
      },
    ],
  };

  const summary = {
    observations: snapshot.observations.length,
    measures: snapshot.measures.length,
    checks: Object.fromEntries(["pass", "warn", "fail"].map((s) => [s, checks.filter((c) => c.status === s).length])),
    versionDiffs: versionDiffs.length,
  };
  console.log(JSON.stringify(summary));
  if (failed.length) {
    for (const f of failed) console.error("FAIL", f.id, f.description, JSON.stringify(f.details));
    process.exit(1);
  }
  const outDir = join(ROOT, "data/snapshots");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify(snapshot, null, 1));
  writeFileSync(join(outDir, "latest.json"), JSON.stringify({ id, file: `${id}.json` }, null, 1));
  console.log(`snapshot ${id} written`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
