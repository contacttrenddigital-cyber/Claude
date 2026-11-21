/**
 * Figures and quotes taken from a bill table or paragraph (not from the metric catalog).
 * Amounts arrive as printed decimal strings; conversion to млн. € is exact (÷ 1000, Decimal).
 */
import Decimal from "decimal.js";
import { fmtNum, fmtSigned, rescale } from "@/lib/format";
import type { Quote } from "@/lib/social/quotes";

export function StatTile({
  label,
  value,
  unit = "хил. €",
  show = "млн. €",
  tag = "2027 · проект",
  note,
  source,
  dp = 1,
  signed = false,
}: {
  label: string;
  value: string | null;
  unit?: string;
  show?: string;
  tag?: string;
  note?: React.ReactNode;
  source: string;
  dp?: number;
  signed?: boolean;
}) {
  const v = value === null ? null : show === unit ? value : rescale(value, unit, show);
  return (
    <article className="flex flex-col gap-2 rounded-3xl border border-rule bg-surface p-5">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-ink-2">{label}</h3>
        <span className="text-[11px] text-muted">{tag}</span>
      </header>
      <p className="num font-display text-[2.8rem] leading-none font-semibold">
        {v === null ? "няма данни" : signed ? fmtSigned(v, dp) : fmtNum(v, dp)}
        {v !== null && <span className="ml-1.5 text-base font-normal text-muted">{show}</span>}
      </p>
      {note && <p className="text-sm text-ink-2">{note}</p>}
      <p className="text-xs text-muted">Източник: {source}</p>
    </article>
  );
}

/** "42.459…" → "42,5%" (display rounding only). */
export function pct(d: Decimal, dp = 1) {
  return `${fmtNum(d, dp)}%`;
}

export function QuoteBlock({ quote, url }: { quote: Quote; url: string }) {
  return (
    <figure className="flex flex-col gap-2 rounded-3xl border border-rule bg-surface p-5">
      <blockquote className="text-ink-2">„{quote.text}“</blockquote>
      <figcaption className="text-xs text-muted">
        <a href={url} rel="noreferrer" className="underline underline-offset-2">
          {quote.where}
        </a>
        , абзац {quote.paragraph} в извлечения текст
      </figcaption>
    </figure>
  );
}
