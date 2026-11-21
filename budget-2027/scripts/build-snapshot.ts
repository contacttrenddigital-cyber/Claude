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
import Decimal from "decimal.js";
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
import { annex3AsTable, extractTable } from "../src/lib/tables/extract";
import { RISK_TABLES, TABLES } from "../src/lib/tables/catalog";
import { paragraphAmounts } from "../src/lib/tables/paragraphs";
import { JsonStat, edptTable } from "../src/lib/eurostat/jsonstat";
import { COFOG_YEARS, cofogChecks, cofogEuTable, cofogHistoryTable } from "../src/lib/eurostat/cofog";
import { readdirSync } from "node:fs";
import { socialFundTables } from "../src/lib/tables/social-funds";
import { ProgramExtract, programChecks, programTable, reconcileUnits } from "../src/lib/programs/programs";
import { IndicatorExtract, indicatorChecks, indicatorTable } from "../src/lib/programs/indicators";
import { ContractRow, procurementChecks, procurementTables, procurementTotals, toContracts } from "../src/lib/procurement/contracts";
import { childSumChecks, crossCheck, grandTotalChecks, sumTopLevel } from "../src/lib/tables/checks";
import { joinByName } from "../src/lib/municipal/join";
import { locatorOf } from "../src/lib/tables/extract";
import { BILLS } from "../src/lib/legislation/bills";
import { billStatus } from "../src/lib/legislation/parliament";
import { SigmaModSchema, modChecks, modRows, modTable } from "../src/lib/calc/min-insurable";
import { SELF_RATES } from "../src/lib/calc/self-employed";
import { ExecutionProvenanceSchema, ExecutionSchema, monthlyChecks, monthlyTable, sameMonthTable } from "../src/lib/execution/monthly";

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

/** latest stored copy of each bill's API JSON (scripts/track-bills.ts) */
if (!existsSync(join(RAW, "parliament/bills.json"))) throw new Error("Missing data/raw/parliament/bills.json: run npm run bills:track first.");
const billManifest = JSON.parse(readFileSync(join(RAW, "parliament/bills.json"), "utf8")) as Record<string, { file: string; sha256: string; retrievedOn: string }>;
/** a changed API copy gets a new document id (documents are immutable in the database) */
const billDocId = (b: { apiId: string; docId: string }) => `${b.docId}-${billManifest[b.apiId]!.sha256.slice(0, 8)}`;
const billJson = (apiId: string) => JSON.parse(readFileSync(join(RAW, "parliament", billManifest[apiId]!.file), "utf8"));

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
    ...BILLS.map((b) =>
      fileDoc(billDocId(b), `parliament/${billManifest[b.apiId]!.file}`, {
        publisher: "Народно събрание",
        title: `Публично API на НС: законопроект ${b.sign} (${b.short}) — етапи, комисии, доклади, гласувания`,
        url: `https://www.parliament.bg/api/v1/bill/${b.apiId}`,
        pageUrl: `https://www.parliament.bg/bg/bills/ID/${b.apiId}`,
        mime: "application/json",
        retrievedOn: billManifest[b.apiId]!.retrievedOn,
        publishedOn: null,
        legalStatus: null,
        versionId,
      }),
    ),
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

  // ── Whole tables with reconciliation ──
  const tables = TABLES.map((spec) => extractTable(docx, spec, documents[0]!.id));
  tables.push(
    annex3AsTable(annex3, 1, { id: "kfpRevenue", title: "Приходи по КФП, подробно", description: "Приложение № 3: приходи, помощи и дарения по видове, 2025–2029.", documentId: documents[0]!.id, file: docx.file }),
    annex3AsTable(annex3, 2, { id: "kfpExpenditure", title: "Разходи по КФП по икономически вид", description: "Приложение № 3: разходи по икономически елементи, 2025–2029.", documentId: documents[0]!.id, file: docx.file }),
  );
  // ── Risks and sensitivity (Табл. VII-1..3) and the 2027 education allocations (мотиви) ──
  tables.push(...RISK_TABLES.map((spec) => extractTable(docx, spec, documents[0]!.id)));
  tables.push(
    paragraphAmounts(
      docx,
      [
        { title: "Предучилищно и училищно образование", from: 614, to: 629 },
        { title: "Висше образование и наука", from: 631, to: 633 },
      ],
      {
        id: "educationAllocations",
        title: "Средства за образование и наука, 2027",
        description: "Мотиви към ЗДБРБ 2027, „Политика в областта на образованието и науката“: изброените суми за 2027 г. Документът не дава сбор.",
        documentId: documents[0]!.id,
        period: "2027",
      },
    ),
  );

  // ── Eurostat: EDP deficit and debt, EU-27 (same year, same status, ESA 2010) ──
  const esDir = join(RAW, "eurostat");
  const esFile = readdirSync(esDir).filter((f) => /^gov_10dd_edpt1-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1);
  if (!esFile) throw new Error("Eurostat file missing: npm run sources:eurostat");
  const esRaw = readFileSync(join(esDir, esFile));
  const es = JsonStat.parse(JSON.parse(esRaw.toString("utf8")));
  const esId = `eurostat-gov_10dd_edpt1-${es.updated.slice(0, 10)}-${sha256(esRaw).slice(0, 8)}`;
  documents.push({
    id: esId,
    sha256: sha256(esRaw),
    bytes: esRaw.length,
    publisher: "Евростат",
    title: `Евростат, gov_10dd_edpt1: дефицит и дълг на сектор „Държавно управление“ (EDP нотификация), обновено ${es.updated.slice(0, 10)}`,
    url: readFileSync(join(esDir, "gov_10dd_edpt1.url"), "utf8").trim(),
    pageUrl: "https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table",
    mime: "application/json",
    retrievedOn: RETRIEVED,
    publishedOn: es.updated.slice(0, 10),
    legalStatus: "официална статистика (отчет)",
    versionId: null,
  });
  const eu = edptTable(es, ["2023", "2024", "2025"], { documentId: esId, file: esFile });
  tables.push(eu);
  const missing = eu.rows.filter((r) => r.cells["B9:2025"]?.value === null || r.cells["GD:2025"]?.value === null).map((r) => r.label);
  checks.push({
    id: "eurostat:edpt1:complete-2025",
    kind: "total",
    status: missing.length === 0 ? "pass" : "warn",
    description: "Евростат: салдо и дълг за 2025 г. за всички 27 държави и ЕС-27",
    details: { missing: missing.join(", ") || "—" },
  });

  // ── Eurostat COFOG: expenditure by function, % of GDP (EU comparison and Bulgaria since 2015) ──
  {
    const file = readdirSync(esDir).filter((f) => /^gov_10a_exp-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1);
    if (!file) throw new Error("Eurostat COFOG file missing: npm run sources:eurostat");
    const raw = readFileSync(join(esDir, file));
    const ds = JsonStat.parse(JSON.parse(raw.toString("utf8")));
    const id = `eurostat-gov_10a_exp-${ds.updated.slice(0, 10)}-${sha256(raw).slice(0, 8)}`;
    documents.push({
      id,
      sha256: sha256(raw),
      bytes: raw.length,
      publisher: "Евростат",
      title: `Евростат, gov_10a_exp: разходи на сектор „Държавно управление“ по функции (COFOG), 2015–2024, обновено ${ds.updated.slice(0, 10)}`,
      url: readFileSync(join(esDir, "gov_10a_exp.url"), "utf8").trim(),
      pageUrl: "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table",
      mime: "application/json",
      retrievedOn: RETRIEVED,
      publishedOn: ds.updated.slice(0, 10),
      legalStatus: "официална статистика (отчет)",
      versionId: null,
    });
    const euC = cofogEuTable(ds, "2024", { documentId: id, file });
    const bgC = cofogHistoryTable(ds, "BG", COFOG_YEARS, { documentId: id, file });
    tables.push(euC, bgC);
    checks.push(...cofogChecks(euC, []), ...cofogChecks(bgC, COFOG_YEARS));
    const gaps = euC.rows.filter((r) => r.cells.TOTAL?.value === null).map((r) => r.label);
    checks.push({ id: "eurostat:cofog:complete-2024", kind: "total", status: gaps.length ? "warn" : "pass", description: "Евростат COFOG: общите разходи за 2024 г. за всички 27 държави и ЕС-27", details: { missing: gaps.join(", ") || "—" } });
  }

  // ── Public procurement: signed contracts from the monthly open data of ЦАИС ЕОП (2026) ──
  {
    const dir = join(RAW, "procurement");
    if (!existsSync(join(dir, "manifest.json"))) throw new Error("Missing data/raw/procurement/manifest.json: run npm run sources:procurement");
    const man = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as Record<string, { file: string; url: string; sha256: string; retrievedOn: string }>;
    const rows: ContractRow[] = [];
    let lastId = "";
    for (const ym of Object.keys(man).sort()) {
      const buf = readFileSync(join(dir, man[ym]!.file));
      if (sha256(buf) !== man[ym]!.sha256) throw new Error(`procurement ${ym}: file differs from the manifest`);
      lastId = `eop-contracts-${ym}-${sha256(buf).slice(0, 8)}`;
      documents.push({
        id: lastId,
        sha256: sha256(buf),
        bytes: buf.length,
        publisher: "Агенция по обществени поръчки (ЦАИС ЕОП)",
        title: `ЦАИС ЕОП, отворени данни: договори, публикувани през ${ym.slice(5)}.${ym.slice(0, 4)}`,
        url: man[ym]!.url,
        pageUrl: "https://app.eop.bg/today/reporting/open-data",
        mime: "application/json",
        retrievedOn: man[ym]!.retrievedOn,
        publishedOn: null,
        legalStatus: "регистър на обществените поръчки (отворени данни)",
        versionId: null,
      });
      rows.push(...ContractRow.array().parse(JSON.parse(buf.toString("utf8"))));
    }
    const { contracts, otherCurrency, duplicates } = toContracts(rows);
    const pt = procurementTables(contracts, lastId);
    tables.push(...pt);
    checks.push(...procurementChecks(contracts, pt), {
      id: "procurement:scope",
      kind: "total",
      status: "pass",
      description: `ЦАИС ЕОП: ${contracts.length} подписани договора (${Object.keys(man).sort()[0]} – ${Object.keys(man).sort().at(-1)}); ${duplicates} повторени реда са броени веднъж; ${otherCurrency} договора в друга валута не влизат в сумите`,
      details: { months: Object.keys(man).sort().join(", "), ...procurementTotals(contracts) },
    });
  }

  // ── ДОО and НЗОК bills (RTF → DOCX via LibreOffice; file/sha256 identify the RTF) ──
  const lawDoc = (name: string, id: string) => {
    const x = DocxExtract.parse(JSON.parse(readFileSync(join(ROOT, `data/extracted/${name}.tables.json`), "utf8")));
    const d = documents.find((doc) => doc.id === id)!;
    if (x.sha256 !== d.sha256) throw new Error(`${name}.tables.json was extracted from a different file`);
    return x;
  };
  const social = socialFundTables(lawDoc("52-602-01-68", "ns-52-602-01-68-rtf"), lawDoc("52-602-01-70", "ns-52-602-01-70-rtf"), {
    doo: "ns-52-602-01-68-rtf",
    nzok: "ns-52-602-01-70-rtf",
  });
  tables.push(...social.tables);
  checks.push(...social.checks);
  const T = (id: string) => tables.find((t) => t.id === id)!;
  const yrs = ["2026", "2027", "2028", "2029"];
  checks.push(...childSumChecks(T("functions"), yrs));
  for (const y of yrs) {
    checks.push(
      crossCheck(
        `xtbl:functions-vs-kfp:${y}`,
        `Сбор на функциите (Табл. III-1) = разходи по КФП без вноската в ЕС (Приложение № 3), ${y}`,
        sumTopLevel(T("functions"), y),
        observations.find((o) => o.metricKey === "kfp.expenditure.excl" && o.period === y)?.value ?? null,
        "0.5",
      ),
    );
  }
  checks.push(...grandTotalChecks(T("municipalities"), ["total", "delegated", "equalizing", "winter", "capital"]));
  const muniTotal = T("municipalities").rows.find((r) => r.kind === "total")!.cells.total!.value;
  const annex9 = T("municipalTotals").rows.find((r) => r.label.startsWith("Основни бюджетни взаимоотношения"))?.cells["2027"]?.value ?? null;
  checks.push(crossCheck("xtbl:municipalities-vs-annex9", "Сбор на общините (чл. 52) = Приложение № 9, 2027", muniTotal, annex9, "0"));
  const moCeiling = T("ceilings").rows.find((r) => r.label === "Министерство на отбраната")?.cells["2027"]?.value ?? null;
  const moDefense = T("defense").rows.find((r) => r.label.startsWith("Общо разходи по бюджета на МО"))?.cells["2027"]?.value ?? null;
  checks.push(
    crossCheck(
      "xtbl:mo-ceiling-vs-defense",
      "Таван на МО (Приложение № 4) = разходи по бюджета на МО (Табл. III-2), 2027, млн. €",
      moCeiling === null ? null : new Decimal(moCeiling).dividedBy(1000).toString(),
      moDefense,
      "0.1",
    ),
  );


  // ── Programme budgets (PDF annexes): published only where programmes add up to the ceiling ──
  const progX = ProgramExtract.parse(JSON.parse(readFileSync(join(ROOT, "data/extracted/program-budgets.json"), "utf8")));
  // НС and ВСС have no row in Приложение № 4: their programmes are reconciled with the expenditure in the bill's own article
  const articleExpenditure = (index: number, mustContain: string, locator: string) => {
    const t = docx.tables.find((x) => x.index === index);
    const text = JSON.stringify([t?.context, t?.rows.slice(0, 2)]);
    if (!t || !text.includes(mustContain)) throw new Error(`bill table ${index} is not „${mustContain}“`);
    const row = t.rows.find((r) => r.map((c) => c.trim()).includes("РАЗХОДИ"));
    const amount = row?.map((c) => c.trim()).find((c) => /^\d{1,3}( \d{3})*,\d$/.test(c));
    if (!amount) throw new Error(`bill table ${index}: no „РАЗХОДИ“ amount`);
    return { value: amount.replace(/ /g, "").replace(",", "."), locator };
  };
  const progStatus = reconcileUnits(progX, T("ceilings"), "0.5", {
    "0100": articleExpenditure(5, "Приема бюджета на Народното", "чл. 3, ал. 1 от законопроекта за държавния бюджет (бюджетът на Народното събрание)"),
    "0600": articleExpenditure(3, "Приема бюджета на съдебната власт", "чл. 2, ал. 1 от законопроекта за държавния бюджет (бюджетът на съдебната власт)"),
  });
  checks.push(...programChecks(progStatus));
  tables.push(programTable(progX, progStatus, { documentId: "ns-52-602-01-71-zip", file: "52-602-01-71.zip" }));
  // performance indicators of the same PDFs (scripts/extract/indicators.py, pdfplumber)
  {
    const ix = IndicatorExtract.parse(JSON.parse(readFileSync(join(ROOT, "data/extracted/indicators.json"), "utf8")));
    for (const u of ix.units) {
      const m = progX.ministries.find((x) => x.code === u.code);
      if (m && m.sha256 !== u.sha256) throw new Error(`indicators.json: ${u.code} was read from a different PDF`);
    }
    tables.push(indicatorTable(ix, { documentId: "ns-52-602-01-71-zip", file: "52-602-01-71.zip" }));
    const codes = new Set(progX.ministries.flatMap((m) => [...m.programs, ...(m.alt ?? [])].map((p) => p.code)));
    checks.push(...indicatorChecks(ix, codes));
  }

  // Табл. III-2: the NATO-classified total = МО + ДВВУ + централен бюджет + other spending units
  const def = T("defense");
  const natoTotal = def.rows.find((r) => r.label === "Разходи за отбрана, съгласно класификацията на НАТО")!;
  const defParts = def.rows.filter((r) => r.level === 0 && /^(Общо разходи по бюджета на МО|Общо трансфери по бюджетите на ДВВУ|Общо разходи по ЦБ|Разходи за отбрана по бюджетите на други ПРБ)/.test(r.label));
  if (defParts.length !== 4) throw new Error("defense: expected 4 component rows");
  for (const y of yrs) {
    checks.push(
      crossCheck(
        `tbl:defense:components:${y}`,
        `Табл. III-2: МО + ДВВУ + ЦБ + други ПРБ = разходи за отбрана по НАТО, ${y}`,
        defParts.reduce((acc, r) => acc.plus(r.cells[y]?.value ?? "0"), new Decimal(0)).toString(),
        natoTotal.cells[y]?.value ?? null,
        "0.1",
      ),
    );
  }
  checks.push(...childSumChecks(def, yrs, "0.1"));

  // ── SIGMA: the MoF draft published on 06.11.2026, as presented by SIGMA ──
  const sigma = createSigmaClient();
  const cat = await sigma.catalog();
  const sigmaDir = join(RAW, "sigma", cat.meta.asOf);
  mkdirSync(sigmaDir, { recursive: true });
  const sigmaFiles: Record<string, unknown> = {};
  for (const slug of ["budget2027", "outlook", "expenditure", "revenue"]) {
    const r = await sigma.dataset(slug);
    const text = r.raw;
    writeFileSync(join(sigmaDir, `${slug}.json`), text);
    sigmaFiles[slug] = r.data;
    documents.push({
      // content-addressed id: a changed SIGMA file is a new document, never an overwrite
      id: `sigma-${slug}-${cat.meta.asOf}-${sha256(text).slice(0, 8)}`,
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

  // ── Minimum insurable income by activity: 2027 from the ДОО bill, 2026 from ЗБДОО 2026 (SIGMA rates.json) ──
  {
    const rr = await sigma.dataset("rates");
    writeFileSync(join(sigmaDir, "rates.json"), rr.raw);
    const ratesId = `sigma-rates-${cat.meta.asOf}-${sha256(rr.raw).slice(0, 8)}`;
    documents.push({
      id: ratesId,
      sha256: sha256(rr.raw),
      bytes: Buffer.byteLength(rr.raw),
      publisher: "СИГМА Бюджет (вторичен източник)",
      title: `СИГМА: ${rr.meta.title} (данни към ${rr.meta.asOf}; ${rr.meta.sourceNote ?? ""})`,
      url: rr.fileUrl,
      pageUrl: "https://sigma-budget.midt.bg/danni/rates",
      mime: "application/json",
      retrievedOn: RETRIEVED,
      publishedOn: rr.meta.asOf,
      legalStatus: "производен набор от ЗБДОО и ЗБНЗОК за 2026 г. и таблицата на НАП",
      versionId: null,
    });
    const sig = SigmaModSchema.parse((rr.data as { minInsurableIncome: unknown }).minInsurableIncome);
    const doo = lawDoc("52-602-01-68", "ns-52-602-01-68-rtf");
    const rows = modRows(doo.tables[3]!.rows, sig);
    tables.push(modTable(rows, "ns-52-602-01-68-rtf"));
    checks.push(...modChecks(rows));
    // the calculator's self-insured rates must equal the НАП table as published by SIGMA (ред 10.1.2 / 10.2.2)
    type Scn = { id: string; split: { employee: { doo: number; upf: number; health: number } }; variants?: { id: string; split: { employee: { doo: number } } }[] };
    const se = (rr.data as { scenarios: Scn[] }).scenarios.find((x) => x.id === "self-employed");
    const sick = se?.variants?.find((v) => v.id === "with-sickness-maternity");
    const got = se ? [se.split.employee.doo, sick?.split.employee.doo ?? null, se.split.employee.upf, se.split.employee.health].map((v) => (v === null ? null : new Decimal(v).toString())) : [];
    const want = [SELF_RATES.doo, SELF_RATES.dooWithSickness, SELF_RATES.upf, SELF_RATES.health];
    checks.push({
      id: "calc:self-employed:rates",
      kind: "cross-source",
      status: JSON.stringify(got) === JSON.stringify(want) ? "pass" : "fail",
      description: "Калкулатор, самоосигуряващ се: ставките (ДОО, ДОО с ОЗМ, УПФ, здравно) = таблицата на НАП по СИГМА",
      details: { calculator: want.join(" / "), nap: got.join(" / ") },
    });
  }

  // ── SIGMA: monthly execution of КФП (cumulative, cash basis) with cell-level provenance ──
  {
    const ex = await sigma.dataset("execution");
    const pv = await sigma.dataset("execution-provenance");
    const e = ExecutionSchema.parse(ex.data);
    ExecutionProvenanceSchema.parse(pv.data);
    const docFor = (slug: string, r: typeof ex, title: string) => {
      writeFileSync(join(sigmaDir, `${slug}.json`), r.raw);
      const doc = {
        id: `sigma-${slug}-${cat.meta.asOf}-${sha256(r.raw).slice(0, 8)}`,
        sha256: sha256(r.raw),
        bytes: Buffer.byteLength(r.raw),
        publisher: "СИГМА Бюджет (вторичен източник)",
        title,
        url: r.fileUrl,
        pageUrl: "https://sigma-budget.midt.bg/danni/execution",
        mime: "application/json",
        retrievedOn: RETRIEVED,
        publishedOn: r.meta.asOf,
        legalStatus: "производен набор от месечните отчети на МФ (https://www.minfin.bg/bg/statistics/5); всяка стойност сочи файл, лист и клетка",
        versionId: null,
      };
      documents.push(doc);
      return doc.id;
    };
    const exId = docFor("execution", ex, `СИГМА: ${ex.meta.title} (данни към ${ex.meta.asOf}; ${ex.meta.sourceNote ?? ""})`);
    docFor("execution-provenance", pv, `СИГМА: произход на месечното изпълнение — файл, лист и клетка на всяко число (данни към ${pv.meta.asOf})`);
    tables.push(monthlyTable(e, exId), sameMonthTable(e, exId));
    checks.push(...monthlyChecks(e));
    // the same September figures are printed in Приложение № 1 of the bill (rounded to 0.1)
    const ap1 = tables.find((t) => t.id === "execution2026")!;
    const last = e.data["2026"]!.months - 1;
    const k = (id: string) => e.data["2026"]!.kfp[id]?.[last] ?? null;
    // Приложение № 1, бележка „**“ към „Капиталови“: „Вкл. нетен прираст на държавния резерв.“
    const capexWithReserve = k("exp.capex") && k("exp.reserve") ? new Decimal(k("exp.capex")!).plus(k("exp.reserve")!).toString() : null;
    for (const [id, re, value] of [
      ["rev", /^ПРИХОДИ, ПОМОЩИ/, k("rev")],
      ["exp.total", /^РАЗХОДИ И ВНОСКА/, k("exp.total")],
      ["exp.capex+reserve", /^Капиталови/, capexWithReserve],
    ] as const) {
      const row = ap1.rows.find((r) => re.test(r.label));
      checks.push(
        crossCheck(
          `exec:ap1:${id}`,
          `СИГМА (месечен отчет, ${e.meta.asOf}) = Приложение № 1 към мотивите, „отчет“: ${row?.label ?? id}${id === "exp.capex+reserve" ? " (капиталови + прираст на държавния резерв, по бележката към реда)" : ""}`,
          value,
          row?.cells.actual?.value ?? null,
          "0.05",
        ),
      );
    }
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
          documentId: documents.find((d) => d.id.startsWith(`sigma-${row.dataset}-${cat.meta.asOf}-`))!.id,
          locator: `СИГМА, byPeriod["2027.draft"], ред „${label}“ (Приложение № 3 по публикацията на МФ от 06.11.2026)`,
          value: row.value,
          original: row.value,
        },
      ],
    });
  }

  // ── Municipalities: bill (чл. 52, 2027) ↔ SIGMA codes, population and ЗДБ 2026 transfers ──
  const muniRaw = await sigma.dataset("municipalities");
  const muniText = muniRaw.raw;
  writeFileSync(join(sigmaDir, "municipalities.json"), muniText);
  documents.push({
    id: `sigma-municipalities-${cat.meta.asOf}-${sha256(muniText).slice(0, 8)}`,
    sha256: sha256(muniText),
    bytes: Buffer.byteLength(muniText),
    publisher: "СИГМА Бюджет (вторичен източник)",
    title: `СИГМА: ${muniRaw.meta.title} (${muniRaw.meta.sourceNote ?? ""})`,
    url: muniRaw.fileUrl,
    pageUrl: "https://sigma-budget.midt.bg/danni/municipalities",
    mime: "application/json",
    retrievedOn: RETRIEVED,
    publishedOn: muniRaw.meta.asOf,
    legalStatus: "ЗДБ 2026 (приет закон), население по Eurostat GISCO LAU 2024",
    versionId: "mf-draft-2026-11-06",
  });
  type MuniItem = { id: string; name: string; region: string; population: number; lawName?: string; transfers: Record<string, number> };
  const muniItems = (muniRaw.data as unknown as { items: MuniItem[]; totals: { transfersKhil: number } }).items;
  const muniTable = T("municipalities");
  const j = joinByName(
    muniTable.rows.filter((r) => r.kind === "data"),
    muniItems,
  );
  checks.push({
    id: "join:municipalities",
    kind: "cross-source",
    status: j.unmatched.length === 0 && j.duplicates.length === 0 && j.matched.length === muniItems.length ? "pass" : "fail",
    description: `Общини: ${j.matched.length} от ${muniTable.rows.filter((r) => r.kind === "data").length} реда в законопроекта са свързани с код; несвързани ${j.unmatched.length}; дублирани кодове ${j.duplicates.length}`,
  });
  const dstr = (n: number | undefined) => (n === undefined || n === null ? null : String(n));
  const municipalities = j.matched.map(({ code, entry, row }) => {
    const it = muniItems.find((i) => i.id === code)!;
    const y2027 = Object.fromEntries(Object.entries(row.cells).map(([k, c]) => [k, c.value]));
    const y2026 = {
      total: dstr(it.transfers.total),
      delegated: dstr(it.transfers.delegated),
      equalizing: dstr(it.transfers.equalizing),
      winter: dstr(it.transfers.winterRoads),
      capital: dstr(it.transfers.capital),
    };
    const pc = (v: string | null) => (v === null ? "0" : new Decimal(v).times(1000).dividedBy(it.population).toDecimalPlaces(2).toFixed(2));
    return {
      code,
      name: entry.name,
      billName: row.label,
      region: it.region,
      population: it.population,
      populationAsOf: "2024-01-01",
      y2027,
      y2026,
      perCapita2027: pc(y2027.total ?? null),
      perCapita2026: pc(y2026.total),
      billLocator: locatorOf(muniTable, row),
    };
  });
  const sum2026 = municipalities.reduce((s, m) => s.plus(m.y2026.total ?? "0"), new Decimal(0));
  checks.push(
    crossCheck(
      "xsrc:municipalities-2026-total",
      "Сбор на трансферите 2026 по общини (СИГМА) = общата сума в СИГМА (ЗДБ 2026, чл. 51)",
      sum2026.toString(),
      String((muniRaw.data as unknown as { totals: { transfersKhil: number } }).totals.transfersKhil),
      "1",
    ),
  );

  // ── Glossary (SIGMA; definitions only — SIGMA's examples use illustrative numbers and are excluded) ──
  const gl = await sigma.dataset("glossary");
  writeFileSync(join(sigmaDir, "glossary.json"), gl.raw);
  const glId = `sigma-glossary-${cat.meta.asOf}-${sha256(gl.raw).slice(0, 8)}`;
  documents.push({
    id: glId,
    sha256: sha256(gl.raw),
    bytes: Buffer.byteLength(gl.raw),
    publisher: "СИГМА Бюджет (вторичен източник)",
    title: `СИГМА: ${gl.meta.title}`,
    url: gl.fileUrl,
    pageUrl: "https://sigma-budget.midt.bg/rechnik",
    mime: "application/json",
    retrievedOn: RETRIEVED,
    publishedOn: gl.meta.asOf,
    legalStatus: "речник; използвани са само определенията",
    versionId: "mf-draft-2026-11-06",
  });
  type GlTerm = { slug: string; title: string; def: string; aliases?: string[] };
  const glossary = (gl.data as unknown as { terms: GlTerm[] }).terms.map((t) => ({
    slug: t.slug,
    term: t.title,
    definition: t.def,
    aliases: t.aliases ?? [],
    documentId: glId,
  }));
  // ── Committees the bill is assigned to (Parliament API) ──
  const billApi = billJson("167645") as {
    dist_list: { A_ns_CL_value: string; L_Act_DTL_value: string }[];
  };
  const committees = billApi.dist_list.map((d) => ({ name: d.A_ns_CL_value, role: d.L_Act_DTL_value, documentId: billDocId(BILLS[0]) }));

  const failed = checks.filter((c) => c.status === "fail");
  const content = {
    documents: documents.map((d) => [d.id, d.sha256]),
    observations: [...observations, ...draftObs],
    measures: m.measures,
    versionDiffs,
    tables,
    checks,
    municipalities,
    glossary,
    committees,
  };
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
    tables,
    municipalities,
    glossary,
    committees,
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
        documentId: documents.find((d) => d.id.startsWith(`sigma-budget2027-${cat.meta.asOf}-`))!.id,
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
        documentId: billDocId(BILLS[0]),
        note: "Водеща: Комисия по бюджет и финанси. Разпределен общо на 24 комисии.",
      },
      // stages after submission, derived from the stored API JSON of each bill
      ...BILLS.flatMap((b) =>
        billStatus(billJson(b.apiId))
          .events.filter((e) => e.type !== "SUBMITTED")
          .map((e) => ({
            id: `ns-${b.apiId}-${e.type.toLowerCase()}`,
            date: e.date,
            type: e.type,
            title: `${b.short}: ${e.title.charAt(0).toLowerCase()}${e.title.slice(1)}`,
            documentId: billDocId(b),
            note: null,
          })),
      ),
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
