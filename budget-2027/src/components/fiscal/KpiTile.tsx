import { change, deficitChange, point } from "@/lib/data/derive";
import type { SeriesView } from "@/lib/data/types";
import { VINTAGE_LONG, VINTAGE_SHORT, decimalsFor, fmtNum, fmtSigned, rescale, unitOf } from "@/lib/format";
import { SourceNote } from "./SourceNote";

interface Props {
  series: SeriesView;
  period?: string;
  base?: string | null;
  /** optional companion ratio (e.g. % of GDP) shown under the main value */
  ratio?: SeriesView;
  displayUnit?: string;
  size?: "lg" | "md";
  note?: string;
}

/**
 * One headline figure with its baseline, definition and source. Changes are shown neutrally:
 * the platform does not colour a higher number as "good" or "bad".
 */
export function KpiTile({ series, period = "2027", base = "2026", ratio, displayUnit, size = "md", note }: Props) {
  const p = point(series, period);
  if (!p) return null;
  const unit = displayUnit ?? series.metric.unit;
  const value = p.value === null ? null : unit === series.metric.unit ? p.value : rescale(p.value, series.metric.unit, unit);
  // number and unit are formatted separately: the thousands separator is also a no-break space
  const num = value === null ? "няма данни" : fmtNum(value, decimalsFor(unit));
  const unitLabel = value === null ? "" : unitOf(unit);
  const ch = base ? change(series, period, base) : null;
  const bp = base ? point(series, base) : undefined;
  const rp = ratio ? point(ratio, period) : undefined;
  const rch = ratio && base ? change(ratio, period, base) : null;
  const dec = decimalsFor(series.metric.unit);
  // balances: describe the size of the deficit in words (a negative number rising is a smaller deficit)
  const isBalance = series.metric.key.endsWith(".balance");
  const dch = isBalance && base ? deficitChange(series, period, base) : null;

  return (
    <article className="flex flex-col gap-2 border-t border-rule-strong pt-3" aria-labelledby={`kpi-${series.metric.key}`}>
      <header className="flex items-baseline justify-between gap-2">
        <h3 id={`kpi-${series.metric.key}`} className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">
          {series.metric.short}
        </h3>
        <span className="text-[11px] text-muted">
          {period} · {VINTAGE_SHORT[p.vintage]}
        </span>
      </header>
      <p className={`num font-semibold leading-none ${size === "lg" ? "text-4xl sm:text-5xl" : "text-3xl"}`}>
        {num}
        <span className="ml-1.5 text-base font-normal text-muted">{unitLabel}</span>
      </p>
      {rp && rp.value !== null && (
        <p className="num text-sm text-ink-2">
          {fmtNum(rp.value)}% от БВП
          {rch && !isBalance && <span className="text-muted"> · {fmtSigned(rch.absolute)} пр.п. спрямо {base}</span>}
          {rch && isBalance && ratio && (() => {
            const r = deficitChange(ratio, period, base!);
            return r && r.direction !== "not-a-deficit" ? (
              <span className="text-muted">
                {" "}
                · {r.direction === "unchanged" ? "без промяна" : `с ${fmtNum(r.magnitude)} пр.п. ${r.direction === "smaller-deficit" ? "по-нисък" : "по-висок"}`} спрямо {base}
              </span>
            ) : null;
          })()}
        </p>
      )}
      {isBalance && dch && bp && bp.value !== null && (
        <p className="num text-sm text-ink-2">
          {dch.direction === "unchanged"
            ? `Дефицитът е същият като през ${base} г.`
            : dch.direction === "not-a-deficit"
              ? `${fmtSigned(ch!.absolute, dec)} ${series.metric.unit} спрямо ${base}`
              : `Дефицитът е ${dch.direction === "smaller-deficit" ? "по-малък" : "по-голям"} с ${fmtNum(dch.magnitude, dec)} ${series.metric.unit}${dch.relative !== null ? ` (${fmtNum(dch.relative)}%)` : ""} спрямо ${base} г. (${VINTAGE_LONG[bp.vintage]}: ${fmtNum(bp.value, dec)})`}
        </p>
      )}
      {!isBalance && ch && bp && bp.value !== null && (
        <p className="num text-sm text-ink-2">
          {ch.kind === "pp" ? (
            <>
              {fmtSigned(ch.absolute)} пр.п. спрямо {base} ({VINTAGE_LONG[bp.vintage]}: {fmtNum(bp.value)}%)
            </>
          ) : (
            <>
              {fmtSigned(ch.absolute, dec)} {series.metric.unit}
              {ch.relative !== null && <> ({fmtSigned(ch.relative)}%)</>} спрямо {base} ({VINTAGE_LONG[bp.vintage]})
            </>
          )}
        </p>
      )}
      <p className="text-[13px] leading-snug text-muted">{note ?? series.metric.definition}</p>
      <SourceNote point={p} />
    </article>
  );
}
