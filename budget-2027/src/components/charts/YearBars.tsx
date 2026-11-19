"use client";

/**
 * Grouped bars by year for 1–2 comparable series (same unit). Bars start at zero.
 * Realised values (отчет) are solid; expected/draft/forecast are hatched — never colour alone.
 * Values arrive as decimal strings; Number() is used only for pixel geometry, never for arithmetic.
 */
import { scaleBand, scaleLinear } from "d3-scale";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Vintage } from "@/lib/ingest/documents";
import { VINTAGE_LONG, VINTAGE_SHORT, fmtNum } from "@/lib/format";

export interface BarSeries {
  name: string;
  color: "series-1" | "series-2" | "neutral";
  points: { period: string; value: string | null; vintage: Vintage; source: string }[];
}

interface Props {
  title: string;
  subtitle?: string;
  unitLabel: string;
  series: BarSeries[];
  reference?: { value: number; label: string };
  decimals?: number;
  height?: number;
}

const COLOR: Record<BarSeries["color"], string> = {
  "series-1": "var(--series-1)",
  "series-2": "var(--series-2)",
  neutral: "var(--neutral-mark)",
};

export function YearBars({ title, subtitle, unitLabel, series, reference, decimals = 1, height = 260 }: Props) {
  const uid = useId().replace(/:/g, "");
  const [active, setActive] = useState<{ s: number; i: number } | null>(null);
  const periods = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.period)))].sort(), [series]);
  // Draw at the real container width so axis text stays 11–13 px on phones (no viewBox shrinking).
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e!.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = W < 480;
  const H = narrow ? Math.round(height * 0.85) : height;
  const m = { top: 16, right: 4, bottom: 40, left: narrow ? 34 : 52 };

  const values = series.flatMap((s) => s.points.map((p) => (p.value === null ? 0 : Number(p.value))));
  if (reference) values.push(reference.value);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const y = scaleLinear()
    .domain([lo, hi])
    .nice(5)
    .range([H - m.bottom, m.top]);
  const x0 = scaleBand<string>().domain(periods).range([m.left, W - m.right]).paddingInner(0.28).paddingOuter(0.1);
  const x1 = scaleBand<number>()
    .domain(series.map((_, i) => i))
    .range([0, x0.bandwidth()])
    .paddingInner(series.length > 1 ? 0.12 : 0);
  const ticks = y.ticks(5);
  const activePoint = active ? series[active.s]!.points.find((p) => p.period === periods[active.i]) : null;

  return (
    <figure className="flex flex-col gap-3">
      <figcaption>
        <p className="text-base font-semibold text-ink">{title}</p>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </figcaption>

      {reference && (
        <p className="flex items-center gap-2 text-xs text-ink-2">
          <svg aria-hidden width="20" height="6">
            <line x1="0" x2="20" y1="3" y2="3" stroke="var(--ink-2)" strokeDasharray="4 4" strokeWidth="1.5" />
          </svg>
          {reference.label}
        </p>
      )}
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Легенда">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-2.5 rounded-[2px]" style={{ background: COLOR[s.color] }} />
              {s.name}
            </li>
          ))}
        </ul>
      )}

      <div className="relative" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full" role="img" aria-label={`${title}. ${unitLabel}.`}>
          <defs>
            {series.map((s, i) => (
              <pattern key={i} id={`h-${uid}-${i}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill={COLOR[s.color]} opacity="0.28" />
                <line x1="0" y1="0" x2="0" y2="6" stroke={COLOR[s.color]} strokeWidth="2.5" />
              </pattern>
            ))}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={t === 0 ? 1.5 : 1} />
              <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="12" fill="var(--muted)" className="num">
                {fmtNum(String(t), Number.isInteger(t) ? 0 : 1)}
              </text>
            </g>
          ))}
          {reference && (
            <g>
              <line
                x1={m.left}
                x2={W - m.right}
                y1={y(reference.value)}
                y2={y(reference.value)}
                stroke="var(--ink-2)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />

            </g>
          )}
          {periods.map((period, i) => (
            <g key={period}>
              {series.map((s, si) => {
                const p = s.points.find((q) => q.period === period);
                if (!p || p.value === null) return null;
                const v = Number(p.value);
                const x = (x0(period) ?? 0) + (x1(si) ?? 0);
                const top = y(Math.max(0, v));
                const h = Math.max(1, Math.abs(y(v) - y(0)));
                const isActive = active?.s === si && active.i === i;
                return (
                  <rect
                    key={si}
                    x={x}
                    y={top}
                    width={x1.bandwidth()}
                    height={h}
                    rx={2}
                    fill={p.vintage === "actual" ? COLOR[s.color] : `url(#h-${uid}-${si})`}
                    stroke={COLOR[s.color]}
                    strokeWidth={isActive ? 2.5 : 1}
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${s.name}, ${period} (${VINTAGE_LONG[p.vintage]}): ${fmtNum(p.value, decimals)} ${unitLabel}`}
                    onMouseEnter={() => setActive({ s: si, i })}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive({ s: si, i })}
                    onBlur={() => setActive(null)}
                    className="cursor-default outline-none"
                  />
                );
              })}
              <text x={(x0(period) ?? 0) + x0.bandwidth() / 2} y={H - m.bottom + 16} textAnchor="middle" fontSize={narrow ? 12 : 13} fill="var(--ink-2)" className="num">
                {period}
              </text>
              <text x={(x0(period) ?? 0) + x0.bandwidth() / 2} y={H - m.bottom + 31} textAnchor="middle" fontSize={narrow ? 10 : 11} fill="var(--muted)">
                {VINTAGE_SHORT[series[0]!.points.find((q) => q.period === period)?.vintage ?? "forecast"]}
              </text>
            </g>
          ))}
        </svg>
        {active && activePoint && activePoint.value !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 right-0 max-w-[16rem] rounded-sm border border-rule-strong bg-surface px-3 py-2 text-xs shadow-sm"
          >
            <p className="font-medium text-ink">
              {series[active.s]!.name} · {activePoint.period}
            </p>
            <p className="num text-base text-ink">
              {fmtNum(activePoint.value, decimals)} <span className="text-xs text-muted">{unitLabel}</span>
            </p>
            <p className="text-muted">{VINTAGE_LONG[activePoint.vintage]}</p>
            <p className="mt-1 text-muted">{activePoint.source}</p>
          </div>
        )}
      </div>

      <p className="flex items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-4 rounded-[2px]" style={{ background: "var(--neutral-mark)" }} /> отчет
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg aria-hidden width="16" height="10">
            <pattern id={`lg-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="var(--neutral-mark)" strokeWidth="2" />
            </pattern>
            <rect width="16" height="10" rx="2" fill={`url(#lg-${uid})`} stroke="var(--neutral-mark)" />
          </svg>
          очаквано / проект / прогноза
        </span>
      </p>

      <details className="text-sm">
        <summary className="inline-flex min-h-11 items-center text-ink-2 underline decoration-rule-strong underline-offset-4 sm:min-h-0">
          Таблица с данните
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="num w-full text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-rule-strong text-xs text-muted">
                <th scope="col" className="py-1 pr-3 font-normal">
                  Година
                </th>
                {series.map((s) => (
                  <th key={s.name} scope="col" className="py-1 pr-3 text-right font-normal">
                    {s.name}, {unitLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period} className="border-b border-rule">
                  <th scope="row" className="py-1 pr-3 font-normal">
                    {period}{" "}
                    <span className="text-xs text-muted">
                      ({VINTAGE_SHORT[series[0]!.points.find((q) => q.period === period)?.vintage ?? "forecast"]})
                    </span>
                  </th>
                  {series.map((s) => {
                    const p = s.points.find((q) => q.period === period);
                    return (
                      <td key={s.name} className="py-1 pr-3 text-right">
                        {p?.value == null ? "няма данни" : fmtNum(p.value, decimals)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
