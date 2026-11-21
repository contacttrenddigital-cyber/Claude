import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { ResultsExplorer, type IndicatorItem, type ProgramOption } from "@/components/programs/ResultsExplorer";
import { getPublished, tableOf } from "@/lib/data/published";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Пари срещу резултати",
  description: "Какво обещават министерствата и агенциите срещу парите за всяка програма: показателите за изпълнение и целевите стойности за 2027–2029 г. от програмните бюджети.",
  alternates: { canonical: "/pari-sreshtu-rezultati" },
};

export default async function Results() {
  const data = await getPublished();
  const pb = tableOf(data, "programBudgets");
  const ind = tableOf(data, "performanceIndicators");
  const zip = data.documents.find((d) => d.id === "ns-52-602-01-71-zip")!;
  const cov = data.checks.find((c) => c.id === "indicators:coverage");
  let unit = "";
  const programs: ProgramOption[] = [];
  for (const r of pb.rows) {
    if (r.kind === "group") {
      unit = r.label;
      continue;
    }
    const code = r.label.split(" ")[0] === "Програма" ? r.label.split(" ").slice(0, 2).join(" ") : r.label.split(" ")[0]!;
    programs.push({ code, label: r.label, unit, budget2027: r.cells["2027"]?.value ?? null });
  }
  const indicators: IndicatorItem[] = ind.rows.map((r) => ({
    program: r.texts?.program ?? "",
    name: r.label,
    unit: r.texts?.unit ?? "",
    kind: r.texts?.kind ?? "",
    targets: Object.fromEntries(ind.columns.map((c) => [c.key, r.cells[c.key]?.text ?? ""])),
    page: r.texts?.page ?? "",
  }));
  const withTargets = new Set(indicators.map((i) => i.program));
  const covered = programs.filter((p) => withTargets.has(p.code)).length;
  const outcome = indicators.filter((i) => i.kind === "полза/ефект").length;
  return (
    <PageShell
      eyebrow="Пари срещу резултати"
      title="Какво обещават срещу парите"
      lead={
        <p>
          Всяка програма в програмните бюджети има цели: показатели за изпълнение с целеви стойности за 2027–2029 г. Тук те са до парите за
          програмата. Показваме ги както са отпечатани: не смятаме цена на единица и не оценяваме, защото отчет за изпълнението на целите още
          няма.
        </p>
      }
      facts={[
        { label: "Показатели", value: String(indicators.length), unit: "", decimals: 0, tone: "sky", note: `${outcome} от тях са за резултат (полза/ефект), останалите — за изпълнение.` },
        { label: "Програми с показатели", value: String(covered), unit: `от ${programs.length}`, decimals: 0, tone: "mustard", note: "Програмите, публикувани в „Бюджетни програми“." },
        { label: "Институции без таблица с показатели", value: String((cov?.details?.withoutIndicatorTables ?? "").split(";").filter((s) => s.trim() && s.trim() !== "—").length), unit: "", decimals: 0, tone: "lilac", note: "В PDF файла им няма такава таблица (при МО е класифицирана)." },
      ]}
      factsSource="програмните бюджети към законопроекта (архив 52-602-01-71.zip), таблици „Показатели за изпълнение“ и „Ползи/ефекти“."
    >
      <Section id="programa" title="Пари и цели на една програма" lead="Избери институция и програма. Парите са „Общо разходи по бюджета“ за 2027 г.; целите са текстът от таблицата с показатели.">
        <ResultsExplorer programs={programs} indicators={indicators} />
      </Section>
      <Section id="vsichki" title="Всички показатели" lead="Търси по дума, например „ученици“, „болници“, „километри“.">
        <TableView table={ind} sourceUrl={zip.pageUrl ?? zip.url} sourceTitle={zip.title} searchable maxHeight="40rem" collapsed />
        <p className="max-w-3xl text-sm text-ink-2">
          Без таблица с показатели: {cov?.details?.withoutIndicatorTables ?? "—"}. Методът е описан в{" "}
          <Link href="/metodologia" className="underline underline-offset-2">
            методологията
          </Link>
          .
        </p>
      </Section>
    </PageShell>
  );
}
