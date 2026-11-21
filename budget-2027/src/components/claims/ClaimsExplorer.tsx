"use client";

import { useMemo, useState } from "react";
import type { ClaimsArchiveView } from "@/lib/data/claims";
import { dateBg, fmtNum } from "@/lib/format";
import { VERDICT_ORDER, VerdictBadge } from "./VerdictBadge";

type Docs = ClaimsArchiveView["documents"];

export function ClaimsExplorer({ archive }: { archive: ClaimsArchiveView }) {
  const all = archive.statements.flatMap((s) => s.claims.map((c) => ({ s, c })));
  const topics = [...new Set(all.map(({ c }) => c.topic))];
  const [topic, setTopic] = useState<string>("всички");
  const [verdict, setVerdict] = useState<string>("всички");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return all.filter(
      ({ c }) =>
        (topic === "всички" || c.topic === topic) &&
        (verdict === "всички" || c.verdict === verdict) &&
        (!qq || `${c.quote} ${c.reasoning} ${c.context ?? ""}`.toLowerCase().includes(qq)),
    );
  }, [all, topic, verdict, q]);

  const counts = VERDICT_ORDER.map((v) => [v, all.filter(({ c }) => c.verdict === v).length] as const).filter(([, n]) => n > 0);

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Филтър по оценка" className="flex flex-wrap gap-2">
        {[["всички", all.length] as const, ...counts].map(([v, n]) => {
          const on = verdict === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() => setVerdict(v)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                on ? "border-transparent bg-ink text-bg" : "border-rule-strong bg-surface text-ink hover:bg-surface-2"
              }`}
            >
              {v === "всички" ? "Всички" : v}
              <span className={`num rounded-full px-2 py-0.5 text-xs ${on ? "bg-bg/20" : "bg-surface-2"}`}>{n}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[13px] text-ink-2">
          Тема
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className="min-h-11 rounded-full border border-rule-strong bg-surface px-4 text-sm text-ink">
            <option value="всички">всички теми</option>
            {topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-ink-2">
          Търси
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="напр. пенсии, ДДС"
            className="min-h-11 w-64 max-w-full rounded-full border border-rule-strong bg-surface px-4 text-sm text-ink placeholder:text-muted"
          />
        </label>
        <p className="num ml-auto text-sm text-ink-2" aria-live="polite">
          {visible.length} от {all.length} твърдения
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        {visible.map(({ s, c }) => (
          <li key={c.id} id={c.id} className="scroll-mt-28">
            <ClaimCard s={s} c={c} docs={archive.documents} />
          </li>
        ))}
        {visible.length === 0 && <li className="text-sm text-ink-2">Няма твърдения по тези филтри.</li>}
      </ol>
    </div>
  );
}

function ClaimCard({
  s,
  c,
  docs,
}: {
  s: ClaimsArchiveView["statements"][number];
  c: ClaimsArchiveView["statements"][number]["claims"][number];
  docs: Docs;
}) {
  const primary = docs[s.documentIds[0]!];
  return (
    <article className="flex h-full flex-col gap-3 rounded-3xl border border-rule bg-surface p-5" aria-labelledby={`${c.id}-q`}>
      <div className="flex flex-wrap items-center gap-2">
        <VerdictBadge verdict={c.verdict} />
        <span className="text-[13px] text-ink-2">{c.kind === "factual" ? "фактическо твърдение" : c.kind === "forecast" ? "прогноза" : "мнение"}</span>
        <span className="ml-auto text-[13px] text-ink-2">
          {c.topic} · {dateBg(s.date)}
        </span>
      </div>
      <blockquote id={`${c.id}-q`} className="text-lg leading-snug font-medium text-ink">
        „{c.quote}“
      </blockquote>
      <p className="text-[15px] leading-relaxed text-ink-2">{c.reasoning}</p>
      <p className="text-[13px] text-ink-2">
        {s.platform}.{" "}
        {primary && (
          <a href={primary.url} rel="noreferrer" className="underline underline-offset-2">
            {primary.publisher}
          </a>
        )}
        {s.documentIds.slice(1).map((id) =>
          docs[id] ? (
            <span key={id}>
              {" "}
              ·{" "}
              <a href={docs[id]!.url} rel="noreferrer" className="underline underline-offset-2">
                {docs[id]!.publisher}
              </a>
            </span>
          ) : null,
        )}
        {s.budgetVersion === "mf-draft-2026-11-06" && " · отнася се за проекта от 06.11.2026"}
      </p>
      <details className="group mt-auto border-t border-rule pt-2">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="transition-transform group-open:rotate-90">›</span>
          Как проверихме
        </summary>
        <div className="mt-2 flex flex-col gap-3 text-sm">
          {c.figures.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-ink">Официални числа</h3>
              <ul className="mt-1 flex flex-col gap-1">
                {c.figures.map((f) => (
                  <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
                    <span className="text-ink-2">
                      {f.label}
                      {docs[f.documentId] && (
                        <>
                          {" "}
                          —{" "}
                          <a href={docs[f.documentId]!.url} rel="noreferrer" className="text-[13px] underline underline-offset-2">
                            {docs[f.documentId]!.publisher}
                          </a>
                        </>
                      )}
                    </span>
                    <span className="num text-right font-semibold text-ink">{f.value === null ? "цитат" : `${fmtNum(f.value, f.value.includes(".") ? f.value.split(".")[1]!.length : 0)} ${f.unit ?? ""}`}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {c.calculation && (
            <section>
              <h3 className="text-sm font-semibold text-ink">Пресмятане</h3>
              <p className="num text-ink">
                {c.calculation.formula} = <strong>{fmtNum(c.calculation.result, c.calculation.result.includes(".") ? c.calculation.result.split(".")[1]!.length : 0)} {c.calculation.unit}</strong>
              </p>
            </section>
          )}
          {c.context && (
            <section>
              <h3 className="text-sm font-semibold text-ink">Контекст</h3>
              <p className="text-ink-2">{c.context}</p>
            </section>
          )}
          <section>
            <h3 className="text-sm font-semibold text-ink">Позиция на правителството</h3>
            <p className="text-ink-2">{c.governmentPosition ?? "Не е намерен конкретен отговор в официалните документи."}</p>
          </section>
        </div>
      </details>
    </article>
  );
}
