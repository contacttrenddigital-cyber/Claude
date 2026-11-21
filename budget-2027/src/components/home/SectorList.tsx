"use client";

/** Spending by function for a chosen year (Табл. III-1) on the periwinkle card: black bars, direct labels. */
import { useState } from "react";
import { fmtNum } from "@/lib/format";
import { Segmented } from "./Segmented";

export interface SectorYear {
  year: string;
  status: string;
  total: string; // млрд. €
  rows: { label: string; value: string; share: string }[]; // value млрд. €, share %
}

export function SectorList({ years, initial, top = 6 }: { years: SectorYear[]; initial: string; top?: number }) {
  const [y, setY] = useState(initial);
  const d = years.find((x) => x.year === y)!;
  const max = Number(d.rows[0]!.share); // pixels only
  return (
    <figure className="rounded-[2rem] bg-card-violet p-5 text-on-card shadow-xl shadow-black/20 sm:p-7">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-display text-[1.65rem] font-semibold">Разходи по сектори</span>
        <span className="num rounded-full bg-tile px-3 py-1 font-mono text-xs text-white">общо {fmtNum(d.total, 1)} млрд. €</span>
      </figcaption>
      <div className="mt-4">
        <Segmented tone="card" label="Година" value={y} onChange={setY} options={years.map((x) => ({ value: x.year, label: x.year, hint: x.status }))} />
      </div>
      <ol className="mt-5 flex flex-col gap-4">
        {d.rows.slice(0, top).map((r) => (
          <li key={r.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-[15px] font-medium">{r.label}</span>
              <span className="num shrink-0 text-[15px] font-semibold">
                {fmtNum(r.share, 0)}%<span className="ml-2 font-mono text-xs font-normal">{fmtNum(r.value, 1)}</span>
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-white/45" aria-hidden>
              <div className="h-full rounded-full bg-tile transition-all duration-500" style={{ width: `${(Number(r.share) / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-xs">
        млрд. €. Източник: мотиви към законопроекта, Табл. III-1 (целият публичен сектор, без вноската в бюджета на ЕС). Дяловете са изчислени от отпечатаните
        стойности. Пълният списък е в „Къде отиват парите“.
      </p>
    </figure>
  );
}
