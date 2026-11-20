"use client";

/**
 * Ranked horizontal bars: current value as bar, comparison value as a thin marker on the same scale.
 * Same unit for every item. Bars start at zero. Values are decimal strings (Number only for pixels).
 */
import { useState } from "react";
import Decimal from "decimal.js";
import { fmtNum, fmtSigned } from "@/lib/format";

export interface RankedItem {
  label: string;
  value: string | null;
  base: string | null;
  href?: string;
  /** emphasised row (bold label, second series colour) */
  highlight?: boolean;
}

export function RankedBars({
  title,
  subtitle,
  items,
  unit,
  valueLabel,
  baseLabel,
}: {
  title: string;
  subtitle: string;
  items: RankedItem[];
  unit: string;
  valueLabel: string;
  baseLabel: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const hasBase = items.some((i) => i.base !== null);
  const sorted = [...items].filter((i) => i.value !== null).sort((a, b) => Number(b.value) - Number(a.value));
  // zero baseline; negative values extend to the left of it (pixels only, never arithmetic)
  const max = Math.max(...sorted.flatMap((i) => [Number(i.value), Number(i.base ?? 0)]), 0);
  const min = Math.min(...sorted.flatMap((i) => [Number(i.value), Number(i.base ?? 0)]), 0);
  const range = max - min || 1;
  const zero = (-min / range) * 100;
  const pos = (v: number) => zero + (v / range) * 100;
  return (
    <figure className="flex flex-col gap-3">
      <figcaption>
        <p className="text-base font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted">{subtitle}</p>
      </figcaption>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Легенда">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-4 rounded-[2px]" style={{ background: "var(--series-1)" }} />
          {valueLabel}
        </li>
        {hasBase && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-0.5" style={{ background: "var(--ink)" }} />
            {baseLabel}
          </li>
        )}
      </ul>
      {!showTable ? (
        <ol className="flex flex-col">
          {sorted.map((i) => {
            const v = Number(i.value);
            const left = Math.min(pos(v), zero);
            const w = Math.abs(pos(v) - zero);
            const bw = i.base === null ? null : pos(Number(i.base));
            const delta = i.base === null ? null : new Decimal(i.value!).minus(i.base).toFixed(1);
            return (
              <li key={i.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-rule py-1.5">
                <span className={`text-[13px] leading-tight ${i.highlight ? "font-semibold text-ink" : "text-ink-2"}`}>
                  {i.href ? (
                    <a href={i.href} className="underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
                      {i.label}
                    </a>
                  ) : (
                    i.label
                  )}
                </span>
                <span className="num text-right text-sm text-ink">
                  {fmtNum(i.value)}
                  {delta !== null && <span className="ml-2 text-xs text-muted">{fmtSigned(delta)}</span>}
                </span>
                <div className="relative col-span-2 mt-1 h-3" aria-hidden>
                  <div className="absolute inset-y-0 rounded-[2px]" style={{ left: `${left}%`, width: `${w}%`, background: i.highlight ? "var(--series-2)" : "var(--series-1)" }} />
                  {min < 0 && <div className="absolute -inset-y-0.5 w-px" style={{ left: `${zero}%`, background: "var(--rule-strong)" }} />}
                  {bw !== null && <div className="absolute -inset-y-0.5 w-0.5" style={{ left: `calc(${bw}% - 1px)`, background: "var(--ink)" }} />}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="overflow-x-auto">
          <table className="num w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-rule-strong text-xs text-muted">
                <th scope="col" className="py-1 pr-3 text-left font-normal">
                  Категория
                </th>
                {hasBase && (
                  <th scope="col" className="py-1 pr-3 text-right font-normal">
                    {baseLabel}
                  </th>
                )}
                <th scope="col" className="py-1 text-right font-normal">
                  {valueLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => (
                <tr key={i.label} className="border-b border-rule">
                  <th scope="row" className="py-1 pr-3 text-left font-normal">
                    {i.label}
                  </th>
                  {hasBase && <td className="py-1 pr-3 text-right">{i.base === null ? "—" : fmtNum(i.base)}</td>}
                  <td className="py-1 text-right">{fmtNum(i.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>Мерна единица: {unit}. Стълбовете започват от нула.</span>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="min-h-11 underline underline-offset-2 sm:min-h-0">
          {showTable ? "Покажи графиката" : "Покажи като таблица"}
        </button>
      </div>
    </figure>
  );
}
