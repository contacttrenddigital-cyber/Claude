import type { Metadata } from "next";
import { PageShell, Section } from "@/components/site/PageShell";
import { getPublished } from "@/lib/data/published";
import { dateBg, fmtNum, fmtSigned } from "@/lib/format";
import { BILLS } from "@/lib/legislation/bills";
import { STAGES, stageFromEvents } from "@/lib/legislation/parliament";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Законодателство: пътят на Бюджет 2027",
  description: "Хронологията на бюджета за 2027 г.: проект, одобрение от МС, внасяне в НС, комисии, гласувания, с официални източници.",
  alternates: { canonical: "/zakonodatelstvo" },
};

export default async function Legislation() {
  const data = await getPublished();
  const lead = data.committees.find((c) => c.role === "водеща");
  const tracks = BILLS.map((b) => {
    const ev = data.events.filter((e) => e.documentId.startsWith(`${b.docId}-`) && e.type !== "SUBMITTED");
    const doc = data.documents.find((d) => d.id.startsWith(`${b.docId}-`));
    return { ...b, stage: stageFromEvents(ev.map((e) => e.type)), last: ev.at(-1), retrievedOn: doc?.retrievedOn ?? null };
  });
  const enacted = tracks.some((t) => t.stage === 5) && !data.versions.some((v) => v.stage === "PROMULGATED" || v.stage === "ENACTED");
  return (
    <PageShell
      eyebrow="Законодателство"
      title="Пътят на Бюджет 2027"
      lead={<p>Докъде е стигнал бюджетът в парламента. Всяко събитие е проверено в посочения източник. Докато законът не е приет, всички мерки са „Предложено“.</p>}
    >
      <Section
        id="etap"
        title="Къде сме сега"
        lead="Етапите в Народното събрание за трите бюджетни законопроекта, по публичното API на НС. Преди това: проект на МФ (06.11) и одобрение от Министерския съвет (16.11)."
      >
        {enacted && (
          <p role="status" className="on-card rounded-3xl bg-card-rose p-4 text-[15px] font-semibold">
            Законът е обнародван, а числата на сайта още са от законопроекта. Обновяваме ги с текста от „Държавен вестник“.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0">
          {tracks.map((t) => (
            <article key={t.apiId} className="flex flex-col gap-3 rounded-3xl border border-rule bg-surface p-5" aria-labelledby={`bill-${t.apiId}`}>
              <header className="flex flex-col gap-1">
                <h3 id={`bill-${t.apiId}`} className="font-display text-[1.6rem] leading-tight font-semibold">
                  {t.short}
                </h3>
                <p className="text-[13px] text-ink-2">
                  № {t.sign}
                  {t.retrievedOn && <> · проверено в API на НС на {dateBg(t.retrievedOn)}</>}
                </p>
              </header>
              <ol className="flex flex-col gap-1.5" aria-label={`Етапи: ${t.short}`}>
                {STAGES.map((st, i) => {
                  const done = i <= t.stage;
                  const current = i === t.stage;
                  return (
                    <li
                      key={st}
                      aria-current={current ? "step" : undefined}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${current ? "on-card bg-card-mustard font-semibold" : done ? "text-ink" : "text-ink-2"}`}
                    >
                      <span aria-hidden className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${current ? "bg-on-card text-card-mustard" : done ? "bg-ink text-bg" : "border border-rule-strong"}`}>
                        {current ? "●" : done ? "✓" : i + 1}
                      </span>
                      {st}
                      {!done && <span className="sr-only"> (предстои)</span>}
                    </li>
                  );
                })}
              </ol>
              <p className="mt-auto text-[14px] text-ink-2">
                {t.last ? (
                  <>
                    Последно: {dateBg(t.last.date)} — {t.last.title.replace(/^[^:]+: /, "")}
                  </>
                ) : (
                  "Внесен на 16.11.2026 г.; още няма доклади на комисиите в API."
                )}
              </p>
            </article>
          ))}
        </div>
        <p className="text-sm text-ink-2">
          Според БТА Комисията по бюджет и финанси е гласувала държавния бюджет на първо четене на 17.11.2026 г.; докладът ѝ още не е в
          API на НС. Гласуване в пленарна зала още няма.
        </p>
      </Section>
      <Section id="hronologia" title="Хронология">
        <ol className="flex flex-col">
          {data.events.map((e) => (
            <li key={e.id} className="grid grid-cols-1 gap-1 border-b border-rule py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <time dateTime={e.date} className="num text-sm text-ink-2">
                {dateBg(e.date)}
              </time>
              <div>
                <p className="text-ink">{e.title}</p>
                {e.note && <p className="text-[13px] text-ink-2">{e.note}</p>}
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
