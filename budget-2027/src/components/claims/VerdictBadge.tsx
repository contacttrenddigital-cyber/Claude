/** Verdict colours follow the site's meaning map: mint = holds, mustard = partly, rose = wrong or misleading, neutral = not rated. */
const STYLE: Record<string, { cls: string; mark: string }> = {
  Потвърдено: { cls: "bg-card-mint", mark: "✓" },
  "Частично вярно": { cls: "bg-card-mustard", mark: "◐" },
  Подвеждащо: { cls: "bg-card-rose", mark: "!" },
  Невярно: { cls: "bg-card-rose", mark: "✗" },
  "Недостатъчно данни": { cls: "bg-card-lilac", mark: "?" },
  Прогноза: { cls: "bg-card-sky", mark: "→" },
  Мнение: { cls: "bg-card-sky", mark: "“" },
};

export function VerdictBadge({ verdict }: { verdict: string }) {
  const s = STYLE[verdict] ?? STYLE["Недостатъчно данни"]!;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold text-on-card ${s.cls}`}>
      <span aria-hidden>{s.mark}</span>
      {verdict}
    </span>
  );
}

export const VERDICT_ORDER = ["Потвърдено", "Частично вярно", "Подвеждащо", "Невярно", "Недостатъчно данни", "Прогноза", "Мнение"];
