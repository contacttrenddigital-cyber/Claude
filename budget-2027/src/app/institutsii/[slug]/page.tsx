import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Decimal from "decimal.js";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";
import { fmtNum, fmtSigned } from "@/lib/format";
import { slugify } from "@/lib/slug";

export const revalidate = 3600;

async function find(slug: string) {
  const data = await getPublished();
  const t = tableOf(data, "ceilings");
  const i = t.rows.findIndex((r) => r.level === 0 && slugify(r.label) === slug);
  if (i < 0) return null;
  const row = t.rows[i]!;
  const sub = [];
  for (let j = i + 1; j < t.rows.length && t.rows[j]!.level === 1; j++) sub.push(t.rows[j]!);
  return { data, t, row, sub };
}

export async function generateStaticParams() {
  const data = await getPublished();
  return tableOf(data, "ceilings")
    .rows.filter((r) => r.level === 0)
    .map((r) => ({ slug: slugify(r.label) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const f = await find((await params).slug);
  return f
    ? { title: `${f.row.label}: таван на разходите 2027–2029`, description: `Таван на разходите на ${f.row.label} по законопроекта за бюджет 2027 (Приложение № 4).`, alternates: { canonical: `/institutsii/${(await params).slug}` } }
    : {};
}

export default async function Institution({ params }: { params: Promise<{ slug: string }> }) {
  const f = await find((await params).slug);
  if (!f) notFound();
  const { data, t, row, sub } = f;
  const src = billSource(data);
  const v = (k: string) => row.cells[k]?.value ?? null;
  const ch = v("2027") && v("2029") ? new Decimal(v("2029")!).minus(v("2027")!) : null;
  const isMO = row.label === "Министерство на отбраната";
  return (
    <PageShell eyebrow="Институция" title={row.label} lead={<p>Таван на разходите по Приложение № 4 към мотивите на законопроекта за бюджет 2027. 2027 г. е проект, 2028–2029 г. са прогноза.</p>}>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {(["2027", "2028", "2029"] as const).map((y) => (
          <article key={y} className="flex flex-col gap-1 border-t border-rule-strong pt-3">
            <h2 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">
              {y} · {y === "2027" ? "проект" : "прогноза"}
            </h2>
            <p className="num text-3xl font-semibold">
              {v(y) ? fmtNum(v(y)) : "—"} <span className="text-base font-normal text-muted">хил. €</span>
            </p>
          </article>
        ))}
      </div>
      {ch && (
        <p className="num text-sm text-ink-2">
          Промяна 2027 → 2029: {fmtSigned(ch.toFixed(1))} хил. €. Ръст или спад на тавана не е оценка за ефективност.
        </p>
      )}
      {sub.length > 0 && (
        <Section title="В това число">
          <TableView table={t} only={[row.rowIndex, ...sub.map((s) => s.rowIndex)]} sourceUrl={src.url} sourceTitle={src.title} />
        </Section>
      )}
      {isMO && (
        <Section title="Разходи за отбрана" lead="Табл. III-2. Таванът на МО съвпада с „Общо разходи по бюджета на МО“ (автоматична проверка).">
          <TableView table={tableOf(data, "defense")} sourceUrl={src.url} sourceTitle={src.title} />
        </Section>
      )}
      {(() => {
        const pt = data.tables["programBudgets"];
        if (!pt) return null;
        const g = pt.rows.find((r) => r.kind === "group" && r.label === row.label);
        const progs = g ? pt.rows.filter((r) => r.group === row.label) : [];
        const check = data.checks.find((c) => c.id.startsWith("programs:") && c.description.includes(`(${row.label})`));
        if (g)
          return (
            <Section title="Бюджетни програми" lead="Програмен бюджет на институцията: „Общо разходи по бюджета“ по програми, хил. €. Сборът за 2027 г. е равен на тавана (автоматична проверка).">
              <TableView table={pt} only={[g.rowIndex, ...progs.map((r) => r.rowIndex)]} sourceUrl={src.url} sourceTitle="Програмни бюджети, приложение към законопроекта (52-602-01-71.zip)" />
            </Section>
          );
        return check ? (
          <Section title="Бюджетни програми">
            <p className="max-w-3xl text-sm text-ink-2">Програмите не са публикувани: {check.description.split("— ")[1] ?? "не минаха проверката"}.</p>
          </Section>
        ) : null;
      })()}
      <Section title="Какво още има">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
          <li>
            Програмният бюджет на институцията е в архива към законопроекта (
            <a href={data.documents.find((d) => d.id === "ns-52-602-01-71-zip")?.url} className="underline underline-offset-2" rel="noreferrer">
              52-602-01-71.zip
            </a>
            ). Показателите за резултати още не са извлечени. Всички програми са в{" "}
            <Link href="/programi" className="underline underline-offset-2">
              Бюджетни програми
            </Link>
            .
          </li>
          <li>
            <Link href="/institutsii" className="underline underline-offset-2">
              Всички институции
            </Link>
          </li>
        </ul>
      </Section>
    </PageShell>
  );
}
