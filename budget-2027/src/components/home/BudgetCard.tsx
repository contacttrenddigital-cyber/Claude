"use client";

/**
 * The budget in four numbers for a chosen year, as candy cards. Values are printed amounts
 * converted to млрд. € on the server (Decimal). Colours follow the meaning map:
 * sky / mustard / violet = data, rose = deficit.
 */
import { useState } from "react";
import { fmtNum } from "@/lib/format";
import { Segmented } from "./Segmented";

export interface YearFacts {
  year: string;
  status: string;
  revenue: string;
  expenditure: string;
  deficit: string;
  debt: string;
  revenuePct: string | null;
  expenditurePct: string | null;
  deficitPct: string | null;
  debtPct: string | null;
}

const CARDS = [
  { key: "revenue", label: "Приходи", bg: "bg-card-sky", tilt: "md:-rotate-2" },
  { key: "expenditure", label: "Разходи", bg: "bg-card-mustard", tilt: "md:rotate-1" },
  { key: "deficit", label: "Дефицит", bg: "bg-card-rose", tilt: "md:-rotate-1" },
  { key: "debt", label: "Държавен дълг", bg: "bg-card-violet", tilt: "md:rotate-2" },
] as const;

export function BudgetCard({ years, initial }: { years: YearFacts[]; initial: string }) {
  const [y, setY] = useState(initial);
  const f = years.find((x) => x.year === y)!;
  const pct = { revenue: f.revenuePct, expenditure: f.expenditurePct, deficit: f.deficitPct, debt: f.debtPct };
  return (
    <section aria-labelledby="facts-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="facts-title" className="text-[15px] font-semibold text-[#f5f2ea]">
          Бюджетът с 4 числа, млрд. €
        </h2>
        <Segmented tone="dark" label="Година" value={y} onChange={setY} options={years.map((x) => ({ value: x.year, label: x.year, hint: x.status }))} />
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:gap-4">
        {CARDS.map((c) => (
          <div key={c.key} className={`flex flex-col gap-1 rounded-3xl p-4 text-on-card shadow-lg shadow-black/30 transition hover:rotate-0 sm:p-5 ${c.bg} ${c.tilt}`}>
            <dt className="font-display text-sm font-semibold tracking-wide uppercase">{c.label}</dt>
            <dd className="num font-display text-[2.4rem] leading-none font-semibold sm:text-5xl">{fmtNum(f[c.key], 1)}</dd>
            {pct[c.key] && <dd className="num mt-1 w-fit rounded-full bg-tile px-2.5 py-0.5 font-mono text-xs text-white">{fmtNum(pct[c.key]!.replace("-", ""), 1)}% от БВП</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}
