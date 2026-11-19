import type { Metadata } from "next";
import { PageShell, Section } from "@/components/site/PageShell";
import { getPublished } from "@/lib/data/published";
import { dateBg, fmtNum, fmtSigned } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Законодателство: пътят на Бюджет 2027",
  description: "Хронологията на бюджета за 2027 г.: проект, одобрение от МС, внасяне в НС, комисии, гласувания, с официални източници.",
  alternates: { canonical: "/zakonodatelstvo" },
};

const STAGES = ["Проект на МФ", "Одобрен от МС", "Внесен в НС", "Комисии", "Първо четене (пленарна зала)", "Второ четене", "Обнародван в ДВ", "В сила"];

export default async function Legislation() {
  const data = await getPublished();
  const lead = data.committees.find((c) => c.role === "водеща");
  return (
    <PageShell
      eyebrow="Законодателство"
      title="Пътят на Бюджет 2027"
      lead={<p>Всяко събитие е проверено в посочения източник. Статусът на всички мерки в момента е „Предложено“: законът не е приет.</p>}
    >
      <Section id="etap" title="Къде сме сега">
        <ol className="flex flex-wrap gap-2" aria-label="Етапи">
          {STAGES.map((s, i) => {
            const done = i <= 3;
            const current = i === 3;
            return (
              <li key={s} className={`rounded-sm border px-3 py-2 text-sm ${current ? "border-accent-fill font-semibold text-ink" : done ? "border-rule-strong text-ink-2" : "border-dashed border-rule text-muted"}`} aria-current={current ? "step" : undefined}>
                {done ? "✓ " : ""}
                {s}
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-ink-2">
          Законопроектът е одобрен на първо гласуване в Комисията по бюджет и финанси (по БТА). Гласуване в пленарна зала още не е
          проверено.
        </p>
      </Section>
      <Section id="hronologia" title="Хронология">
        <ol className="flex flex-col">
          {data.events.map((e) => (
            <li key={e.id} className="grid grid-cols-1 gap-1 border-b border-rule py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <time dateTime={e.date} className="num text-sm text-muted">
                {dateBg(e.date)}
              </time>
              <div>
                <p className="text-ink">{e.title}</p>
                {e.note && <p className="text-xs text-muted">{e.note}</p>}
                <a href={e.url} rel="noreferrer" className="text-xs text-ink-2 underline underline-offset-2">
                  {e.documentTitle}
                </a>
              </div>
            </li>
          ))}
        </ol>
      </Section>
      <Section id="versii" title="Версии и разлики" lead="Приложение № 3, 2027 г., млн. €: проект от 06.11 срещу внесения текст от 16.11.">
        <ul className="flex flex-col">
          {data.versionDiffs.map((d) => (
            <li key={d.label} className="num grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-rule py-1.5 text-sm">
              <span className="text-ink-2">{d.label}</span>
              <span>
                {fmtNum(d.before)} → {fmtNum(d.after)} ({d.difference === null ? "—" : fmtSigned(d.difference)})
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="komisii" title={`Комисии (${data.committees.length})`} lead={`Водеща: ${lead?.name}. Разпределение по данни от публичното API на Народното събрание.`}>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {data.committees.map((c) => (
            <li key={c.name} className="text-ink-2">
              {c.name} <span className="text-xs text-muted">({c.role})</span>
            </li>
          ))}
        </ul>
      </Section>
    </PageShell>
  );
}
