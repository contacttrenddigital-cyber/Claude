"use client";

/**
 * Horizontal waterfall: revenue components build up to total revenue, expenditure components
 * draw it down, ending at the printed balance. Steps are computed server-side (kfpWaterfall),
 * which throws if they do not reconcile with the printed balance.
 */
import { scaleLinear } from "d3-scale";
import { useState } from "react";
import type { WaterfallStep } from "@/lib/data/derive";
import { fmtNum, fmtSigned } from "@/lib/format";

export function Waterfall({ steps, unitLabel, title, subtitle }: { steps: WaterfallStep[]; unitLabel: string; title: string; subtitle: string }) {
  const [active, setActive] = useState<number | null>(null);
  const nums = steps.flatMap((s) => [Number(s.start), Number(s.end)]);
  const lo = Math.min(0, ...nums);
  const hi = Math.max(0, ...nums);
  const W = 640;
  const rowH = 34;
  const labelW = 0; // labels are HTML, above each bar on small screens
  const x = scaleLinear().domain([lo, hi]).nice(8).range([8 + labelW, W - 8]);
  const ticks = x.ticks(8).filter((_, i, a) => a.length <= 6 || i % 2 === 0);

  return (
    <figure className="flex flex-col gap-3">
      <figcaption>
        <p className="text-base font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted">{subtitle}</p>
      </figcaption>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Легенда">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 rounded-[2px]" style={{ background: "var(--series-1)" }} />
          приходи (+)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 rounded-[2px]" style={{ background: "var(--series-2)" }} />
          разходи (−)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 rounded-[2px]" style={{ background: "var(--neutral-mark)" }} />
          сборни редове
        </li>
      </ul>
      <ol className="flex flex-col">
        {steps.map((s, i) => {
          const a = Number(s.start);
          const b = Number(s.end);
          const left = x(Math.min(a, b));
          const width = Math.max(2, Math.abs(x(b) - x(a)));
          const color = s.kind === "inflow" ? "var(--series-1)" : s.kind === "outflow" ? "var(--series-2)" : "var(--neutral-mark)";
          const shown = s.kind === "total" ? fmtNum(s.value) : fmtSigned(s.value);
          return (
            <li
              key={s.key}
              tabIndex={0}
              aria-label={`${s.label}: ${shown} ${unitLabel}${s.formula ? `; изчислено: ${s.formula}` : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 border-b border-rule py-1.5 outline-none ${active === i ? "bg-surface-2" : ""} ${s.kind === "total" ? "font-semibold" : ""}`}
            >
              <span className="text-[13px] leading-tight text-ink-2">
                {s.label}
                {s.formula && <span className="ml-1 text-[11px] font-normal text-muted">(= {s.formula})</span>}
              </span>
              <span className="num text-right text-sm text-ink">{shown}</span>
              <svg viewBox={`0 0 ${W} ${rowH / 2}`} className="col-span-2 mt-1 h-3 w-full" aria-hidden preserveAspectRatio="none">
                <line x1={x(0)} x2={x(0)} y1={0} y2={rowH / 2} stroke="var(--rule-strong)" />
                <rect x={left} y={2} width={width} height={rowH / 2 - 4} rx={2} fill={color} />
              </svg>
            </li>
          );
        })}
      </ol>
      <div className="num flex justify-between text-[11px] text-muted" aria-hidden>
        {ticks.map((t) => (
          <span key={t}>{fmtNum(String(t), 0)}</span>
        ))}
      </div>
      <p className="text-xs text-muted">Скала: {unitLabel}. Стойностите са отпечатаните в Приложение № 3; два реда са изчислени по показаната формула.</p>
    </figure>
  );
}
