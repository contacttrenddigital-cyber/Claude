import type { PointView } from "@/lib/data/types";
import { dateBg } from "@/lib/format";

const REVIEW_LABEL: Record<PointView["review"], string> = {
  cross_checked: "Съвпада на 2 места в документа",
  single_source: "1 място в документа",
  conflict: "Различни стойности в документа",
  editor_approved: "Одобрено от редактор",
};

export function ReviewBadge({ review }: { review: PointView["review"] }) {
  const tone =
    review === "conflict"
      ? "text-warning border-warning/40"
      : review === "cross_checked" || review === "editor_approved"
        ? "text-beneficial border-beneficial/40"
        : "text-muted border-rule-strong";
  const mark = review === "conflict" ? "!" : review === "single_source" ? "·" : "✓";
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] leading-none ${tone}`}>
      <span aria-hidden>{mark}</span>
      {REVIEW_LABEL[review]}
    </span>
  );
}

/** Expandable citation for one data point: document, exact locator, hash, retrieval date. */
export function SourceNote({ point, label = "Източник" }: { point: PointView; label?: string }) {
  const first = point.sources[0]!;
  return (
    <details className="group text-xs text-muted">
      <summary className="inline-flex min-h-11 items-center gap-1.5 underline decoration-rule-strong underline-offset-4 hover:text-ink sm:min-h-0">
        <span aria-hidden className="transition-transform group-open:rotate-90">›</span>
        {label}: {first.publisher}
      </summary>
      <div className="mt-2 space-y-2 border-l-2 border-rule pl-3">
        {point.sources.map((s, i) => (
          <div key={i}>
            <p className="text-ink-2">
              <a className="underline underline-offset-2 hover:text-ink" href={s.pageUrl ?? s.url} rel="noreferrer">
                {s.documentTitle}
              </a>
            </p>
            <p>{s.locator}</p>
            <p className="num">
              Отпечатано: {s.value ?? "празна клетка"} · изтеглено {dateBg(s.retrievedOn)} ·{" "}
              <a className="underline underline-offset-2" href={s.url} rel="noreferrer">
                оригинален файл
              </a>{" "}
              · SHA-256 <code className="font-mono text-[10px]">{s.sha256.slice(0, 12)}…</code>
            </p>
          </div>
        ))}
        <ReviewBadge review={point.review} />
      </div>
    </details>
  );
}
