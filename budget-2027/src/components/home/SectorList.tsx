"use client";

/** Spending by function for a chosen year (Табл. III-1): category list with icons and shares. */
import { useState } from "react";
import { Icon, type IconName } from "@/components/site/Icon";
import { fmtNum } from "@/lib/format";
import { Segmented } from "./Segmented";

export interface SectorYear {
  year: string;
  status: string;
  total: string; // млрд. €
  rows: { label: string; value: string; share: string }[]; // value млрд. €, share %
}

const LOOK: { match: RegExp; icon: IconName; tint: string }[] = [
  { match: /^Социално/, icon: "users", tint: "bg-tint-blue text-tint-blue-ink" },
  { match: /^Икономически/, icon: "briefcase", tint: "bg-tint-orange text-tint-orange-ink" },
  { match: /^Здраве/, icon: "cross", tint: "bg-tint-pink text-tint-pink-ink" },
  { match: /^Отбрана/, icon: "shield", tint: "bg-tint-violet text-tint-violet-ink" },
  { match: /^Образование/, icon: "book", tint: "bg-tint-green text-tint-green-ink" },
  { match: /^Общи/, icon: "building", tint: "bg-tint-amber text-tint-amber-ink" },
  { match: /^Жилищно/, icon: "crane", tint: "bg-tint-green text-tint-green-ink" },
  { match: /^Култура/, icon: "star", tint: "bg-tint-pink text-tint-pink-ink" },
];
const look = (label: string) => LOOK.find((l) => l.match.test(label)) ?? { icon: "grid" as IconName, tint: "bg-surface-2 text-ink-2" };

export function SectorList({ years, initial }: { years: SectorYear[]; initial: string }) {
  const [y, setY] = useState(initial);
  const d = years.find((x) => x.year === y)!;
  const max = Number(d.rows[0]!.share); // pixels only
  return (
    <div className="rounded-[28px] border border-rule bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Година" value={y} onChange={setY} options={years.map((x) => ({ value: x.year, label: x.year, hint: x.status }))} />
        <p className="num text-sm text-muted">
          общо <strong className="font-semibold text-ink">{fmtNum(d.total, 1)} млрд. €</strong>
        </p>
      </div>
      <ul className="mt-4 divide-y divide-rule">
        {d.rows.map((r) => {
          const l = look(r.label);
          return (
            <li key={r.label} className="flex items-center gap-3 py-3">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${l.tint}`}>
                <Icon name={l.icon} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-medium text-ink">{r.label}</span>
                  <span className="num shrink-0 text-[15px] font-semibold text-ink">{fmtNum(r.value, 1)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <span className="block h-full rounded-full bg-series-1 transition-all duration-500" style={{ width: `${(Number(r.share) / max) * 100}%` }} />
                  </span>
                  <span className="num w-10 shrink-0 text-right text-xs text-muted">{fmtNum(r.share, 0)}%</span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">
        млрд. €. Източник: мотиви към законопроекта, Табл. III-1 (целият публичен сектор, без вноската в бюджета на ЕС). Дяловете са изчислени от
        отпечатаните стойности.
      </p>
    </div>
  );
}
