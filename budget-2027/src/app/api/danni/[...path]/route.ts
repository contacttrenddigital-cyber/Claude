import { NextResponse } from "next/server";
import { getPublished } from "@/lib/data/published";
import { getClaimsArchive } from "@/lib/data/claims";
import { toCsv } from "@/lib/export";

export const revalidate = 3600;

const LICENSE = "Данните са от официални документи (Народно събрание, Министерски съвет) и СИГМА Бюджет; посочете източника и снимката.";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const data = await getPublished();
  const meta = {
    snapshot: data.snapshot.id,
    published: data.snapshot.publishedAt,
    retrieved: data.snapshot.retrievedOn,
    status: "законопроект, внесен в НС на 16.11.2026 (не е приет)",
    license: LICENSE,
  };
  const [kind, id] = path;
  let header: string[] = [];
  let rows: (string | number | null)[][] = [];
  let json: unknown;

  if (kind === "pokazateli") {
    header = ["metric", "label", "scope", "basis", "unit", "version", "period", "vintage", "value", "review", "source_document", "locator"];
    for (const s of Object.values(data.series))
      for (const p of s.points)
        rows.push([s.metric.key, s.metric.label, s.metric.scope, s.metric.basis, s.metric.unit, s.versionId, p.period, p.vintage, p.value, p.review, p.sources[0]!.documentTitle, p.sources[0]!.locator]);
    json = Object.values(data.series);
  } else if (kind === "merki") {
    header = ["direction", "title", "effect_2027", "effect_2028", "effect_2029", "unit", "basis", "locator"];
    rows = data.measures.map((m) => [m.direction, m.title, m.effect2027, m.effect2028, m.effect2029, "млн. €", "начислена", m.locator]);
    json = data.measures;
  } else if (kind === "obshtini") {
    header = ["code", "name", "region", "population_2024", "total_2026_law", "total_2027_bill", "per_capita_2026", "per_capita_2027", "unit", "bill_locator"];
    rows = data.municipalities.map((m) => [m.code, m.name, m.region, m.population, m.y2026.total ?? null, m.y2027.total ?? null, m.perCapita2026, m.perCapita2027, "хил. € (общо); € (на жител)", m.billLocator]);
    json = data.municipalities;
  } else if (kind === "tablitsi" && id && data.tables[id]) {
    const t = data.tables[id]!;
    header = ["row", "label", "level", "kind", "group", ...t.columns.map((c) => `${c.label} [${c.unit || "текст"}; ${c.vintage}]`), ...t.textColumns.map((c) => c.label)];
    rows = t.rows.map((r) => [r.rowIndex + 1, r.label, r.level, r.kind, r.group, ...t.columns.map((c) => r.cells[c.key]?.value ?? r.cells[c.key]?.text ?? null), ...t.textColumns.map((c) => r.texts?.[c.key] ?? null)]);
    Object.assign(meta, { table: t.title, source: `${t.caption} (таблица ${t.tableIndex} в ${t.file})` });
    json = t;
  } else if (kind === "tvardenia") {
    const a = await getClaimsArchive("Асен Василев");
    header = ["statement_date", "claim_id", "topic", "kind", "verdict", "quote", "reasoning"];
    rows = a.statements.flatMap((s) => s.claims.map((c) => [s.date, c.id, c.topic, c.kind, c.verdict, c.quote, c.reasoning]));
    json = a;
  } else {
    return NextResponse.json({ error: "Няма такъв набор", available: ["pokazateli", "merki", "obshtini", "tvardenia", ...Object.keys(data.tables).map((t) => `tablitsi/${t}`)] }, { status: 404 });
  }

  const name = `budget2027-${path.join("-")}-${data.snapshot.id}`;
  if (format === "csv") {
    return new NextResponse(toCsv(header, rows, meta), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}.csv"` },
    });
  }
  return NextResponse.json({ meta, data: json }, { headers: { "content-disposition": `inline; filename="${name}.json"` } });
}
