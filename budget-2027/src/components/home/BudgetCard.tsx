"use client";

/**
 * Headline card: the budget in four numbers for a chosen year. Values are printed amounts
 * converted to млрд. € on the server (Decimal); the bar is pixels only.
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
  deficitPct: string | null;
  debtPct: string | null;
}

export function BudgetCard({ years, initial }: { years: YearFacts[]; initial: string }) {
  const [y, setY] = useState(initial);
  const f = years.find((x) => x.year === y)!;
  const ratio = Math.min(100, (Number(f.revenue) / Number(f.expenditure)) * 100); // pixels only
  return (
    <section aria-labelledby="facts-title" className="rounded-[28px] bg-card-dark p-5 text-white shadow-2xl shadow-black/20 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="facts-title" className="flex items-center gap-2 text-[15px] font-medium">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10" aria-hidden>
            €
          </span>
          Бюджетът с 4 числа
        </h2>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">млрд. €</span>
      </div>
      <div className="mt-4">
        <Segmented
          tone="dark"
          label="Година"
          value={y}
          onChange={setY}
          options={years.map((x) => ({ value: x.year, label: x.year, hint: x.status }))}
        />
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/70">Харчи</p>
          <p className="num text-[2.6rem] leading-none font-semibold tracking-tight">{fmtNum(f.expenditure, 1)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/70">Събира</p>
          <p className="num text-2xl font-semibold">{fmtNum(f.revenue, 1)}</p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
        <div className="h-full rounded-full bg-[#5b75ff] transition-all duration-500" style={{ width: `${ratio}%` }} />
      </div>
      <p className="mt-2 text-xs text-white/60">Синьото е колко от разходите покриват приходите; останалото е дефицит.</p>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card-dark-2 p-4">
          <dt className="text-xs text-white/70">Дефицит</dt>
          <dd className="num mt-1 text-2xl font-semibold text-[#ffab84]">{fmtNum(f.deficit, 1)}</dd>
          {f.deficitPct && <dd className="num text-xs text-white/60">{fmtNum(f.deficitPct.replace("-", ""), 1)}% от БВП</dd>}
        </div>
        <div className="rounded-2xl bg-card-dark-2 p-4">
          <dt className="text-xs text-white/70">Държавен дълг</dt>
          <dd className="num mt-1 text-2xl font-semibold">{fmtNum(f.debt, 1)}</dd>
          {f.debtPct && <dd className="num text-xs text-white/60">{fmtNum(f.debtPct, 1)}% от БВП</dd>}
        </div>
      </dl>
    </section>
  );
}
