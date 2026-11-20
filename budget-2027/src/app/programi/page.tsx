import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, tableOf } from "@/lib/data/published";
import { slugify } from "@/lib/slug";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Бюджетни програми 2027",
  description:
    "Разходите по бюджетни програми на министерствата и агенциите за 2024–2029 г. по програмните бюджети към законопроекта за бюджет 2027, проверени срещу таваните на разходите.",
  alternates: { canonical: "/programi" },
};

export default async function Programs() {
  const data = await getPublished();
  const t = tableOf(data, "programBudgets");
  const zip = data.documents.find((d) => d.id === "ns-52-602-01-71-zip")!;
  const units = t.rows.filter((r) => r.kind === "group");
  const progs = t.rows.filter((r) => r.kind === "data");
  const skipped = data.checks.filter((c) => c.id.startsWith("programs:") && c.status !== "pass");
  return (
    <PageShell
      eyebrow="Бюджетни програми"
      title="Бюджетни програми"
      lead={
        <>
          <p>
            Министерствата и агенциите представят бюджета си по програми: за какво се харчи, а не само по видове разходи. Тук са
            разходите по програми от програмните бюджети към законопроекта (архивът{" "}
            <a href={zip.url} rel="noreferrer" className="underline underline-offset-2">
              52-602-01-71.zip
            </a>
            ): отчет за 2024 и 2025 г., закон за 2026 г., проект за 2027 г. и прогноза за 2028–2029 г.
          </p>
          <p>
            Показваме {progs.length} програми на {units.length} институции: само тези, при които сборът на програмите за 2027 г. е равен на
            тавана им в Приложение № 4. Останалите са изброени по-долу с причината.
          </p>
        </>
      }
    >
      <Section id="programi" title="Разходи по програми" lead="„Общо разходи по бюджета“ на програмата, хил. €. Последната колона включва и средствата по други бюджети и от ЕС. Търси по име на институция или програма.">
        <TableView table={t} sourceUrl={zip.pageUrl ?? zip.url} sourceTitle={zip.title} searchable maxHeight="48rem" />
      </Section>

      <Section id="institutsii" title="Институции с програми">
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => (
            <li key={u.rowIndex}>
              <Link href={`/institutsii/${slugify(u.label)}`} className="underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
                {u.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="nepublikuvani" title={`Не са публикувани (${skipped.length})`} lead="Не показваме частични числа. Причината е или в документа (например няма отделен таван), или в разчитането на PDF файла.">
        <ul className="max-w-3xl list-disc space-y-1 pl-5 text-sm text-ink-2">
          {skipped.map((c) => (
            <li key={c.id}>{c.description.replace(/^Програмен бюджет /, "")}</li>
          ))}
        </ul>
      </Section>

      <Section id="pokazateli" title="Показатели за резултати">
        <p className="max-w-3xl text-sm text-ink-2">
          Програмните бюджети съдържат и показатели за изпълнение с целеви стойности. Те още не са извлечени: таблиците им са с различно
          оформление във всеки документ, а при Министерството на отбраната са класифицирана информация. Виж{" "}
          <Link href="/metodologia" className="underline underline-offset-2">
            методологията
          </Link>
          .
        </p>
      </Section>
    </PageShell>
  );
}
