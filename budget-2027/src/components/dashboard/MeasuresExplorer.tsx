"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { measureGroup, type MeasureGroup } from "@/lib/data/derive";
import type { MeasureView } from "@/lib/data/types";
import { fmtSigned } from "@/lib/format";

const GROUPS: { id: MeasureGroup; title: string; lead: string }[] = [
  {
    id: "pays-more",
    title: "Кой плаща повече?",
    lead: "Приходни мерки с положителен ефект за бюджета през 2027 г. — нови или по-високи данъци, осигуровки, такси и такива с ефект от по-добра събираемост.",
  },
  {
    id: "relief-or-more-spending",
    title: "Какво се подобрява?",
    lead: "Данъчни облекчения (по-малко приходи) и разходни мерки с повече средства — например за заплати, деца и социално подпомагане.",
  },
  {
    id: "cuts",
    title: "Къде се съкращава?",
    lead: "Разходни мерки с отрицателен ефект — оптимизации, съкращения и отпадащи плащания.",
  },
];

type Sort = "magnitude" | "alpha";

/** "Табл. II-7: Дискреционни … (таблица 19 в …docx), ред 2" → "Табл. II-7, ред 2" */
function shortLocator(locator: string): string {
  const table = locator.split(":")[0]!.trim();
  const row = locator.match(/ред \d+$/)?.[0];
  return row ? `${table}, ${row}` : table;
}

export function MeasuresExplorer({ measures }: { measures: MeasureView[] }) {
  const [group, setGroup] = useState<MeasureGroup>("pays-more");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("magnitude");

  const byGroup = useMemo(() => {
    const out: Record<MeasureGroup, MeasureView[]> = { "pays-more": [], "relief-or-more-spending": [], cuts: [] };
    const none: MeasureView[] = [];
    for (const m of measures) {
      const g = measureGroup(m.direction, m.effect2027);
      (g ? out[g] : none).push(m);
    }
    return { ...out, none };
  }, [measures]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = byGroup[group].filter((m) => !q || m.title.toLowerCase().includes(q));
    return [...list].sort((a, b) =>
      sort === "alpha"
        ? a.title.localeCompare(b.title, "bg")
        : new Decimal(b.effect2027!).abs().comparedTo(new Decimal(a.effect2027!).abs()),
    );
  }, [byGroup, group, query, sort]);

  const max = rows.reduce((acc, m) => Decimal.max(acc, new Decimal(m.effect2027!).abs()), new Decimal(0));
  const total = byGroup[group].reduce((acc, m) => acc.plus(m.effect2027!), new Decimal(0));
  const active = GROUPS.find((g) => g.id === group)!;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Групи мерки" className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            role="tab"
            id={`tab-${g.id}`}
            aria-selected={group === g.id}
            aria-controls="measures-panel"
            onClick={() => setGroup(g.id)}
            className={`min-h-11 rounded-sm border px-3 text-sm ${group === g.id ? "border-ink bg-ink text-bg" : "border-rule-strong text-ink-2 hover:border-ink"}`}
          >
            {g.title} <span className="num">({byGroup[g.id].length})</span>
          </button>
        ))}
      </div>

      <div id="measures-panel" role="tabpanel" aria-labelledby={`tab-${group}`} className="flex flex-col gap-3">
        <p className="max-w-3xl text-sm text-ink-2">{active.lead}</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Търси в мерките
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="напр. ДДС, хазарт, деца"
              className="min-h-11 w-64 max-w-full rounded-sm border border-rule-strong bg-surface px-3 text-sm text-ink placeholder:text-muted"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Подреди по
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-sm text-ink"
            >
              <option value="magnitude">ефект за 2027 г. (по абсолютна стойност)</option>
              <option value="alpha">азбучен ред</option>
            </select>
          </label>
          <p className="num ml-auto text-sm text-ink-2">
            Сбор на групата, 2027 г.: <strong className="text-ink">{fmtSigned(total.toFixed())} млн. €</strong>
          </p>
        </div>

        <ol className="flex flex-col" aria-live="polite">
          {rows.map((m) => {
            const v = new Decimal(m.effect2027!);
            const w = max.isZero() ? 0 : v.abs().dividedBy(max).times(100).toNumber();
            return (
              <li key={m.id} className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-rule py-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
                <div className="flex flex-col gap-1">
                  <p className="text-sm leading-snug text-ink">{m.title}</p>
                  <p className="text-xs text-muted">
                    {m.direction === "revenue" ? "Приходна мярка" : "Разходна мярка"} · оценка на МФ, начислена основа ·{" "}
                    <a className="underline underline-offset-2" href={m.url} rel="noreferrer">
                      {shortLocator(m.locator)}
                    </a>
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="num text-right text-sm font-semibold text-ink">{fmtSigned(m.effect2027!)} млн. €</p>
                  <div className="h-2 w-full rounded-[2px] bg-surface-2" aria-hidden>
                    <div
                      className="h-2 rounded-[2px]"
                      style={{ width: `${w}%`, background: m.direction === "revenue" ? "var(--series-1)" : "var(--series-2)", marginLeft: "auto" }}
                    />
                  </div>
                  <p className="num text-right text-[11px] text-muted">
                    2028: {m.effect2028 === null ? "—" : fmtSigned(m.effect2028)} · 2029: {m.effect2029 === null ? "—" : fmtSigned(m.effect2029)}
                  </p>
                </div>
              </li>
            );
          })}
          {rows.length === 0 && <li className="py-6 text-sm text-muted">Няма мерки, които отговарят на търсенето.</li>}
        </ol>
        {byGroup.none.length > 0 && (
          <details className="text-sm text-ink-2">
            <summary className="inline-flex min-h-11 items-center underline decoration-rule-strong underline-offset-4 sm:min-h-0">
              {byGroup.none.length} мерки без ефект за 2027 г. (само за 2028–2029 г.)
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {byGroup.none.map((m) => (
                <li key={m.id} className="num">
                  {m.title} — 2028: {m.effect2028 === null ? "—" : fmtSigned(m.effect2028)} · 2029:{" "}
                  {m.effect2029 === null ? "—" : fmtSigned(m.effect2029)} млн. €
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="text-xs text-muted">
          Ефектът е оценката на Министерството на финансите в Табл. II-7 и II-8 от мотивите (АСБП 2027–2029), в млн. € на
          начислена основа. Положителна стойност при приходна мярка означава повече приходи за бюджета; групирането е по знака на тази
          оценка и не е оценка дали мярката е добра или лоша. „—“ означава празна клетка в документа.
        </p>
      </div>
    </div>
  );
}
