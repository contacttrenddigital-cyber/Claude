const STYLE: Record<string, { cls: string; mark: string }> = {
  Потвърдено: { cls: "border-beneficial text-beneficial", mark: "✓" },
  "Частично вярно": { cls: "border-warning text-warning", mark: "◐" },
  Подвеждащо: { cls: "border-adverse text-adverse", mark: "!" },
  Невярно: { cls: "border-adverse text-adverse", mark: "✗" },
  "Недостатъчно данни": { cls: "border-rule-strong text-muted", mark: "?" },
  Прогноза: { cls: "border-rule-strong text-ink-2", mark: "→" },
  Мнение: { cls: "border-rule-strong text-ink-2", mark: "“" },
};

export function VerdictBadge({ verdict }: { verdict: string }) {
  const s = STYLE[verdict] ?? STYLE["Недостатъчно данни"]!;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-semibold ${s.cls}`}>
      <span aria-hidden>{s.mark}</span>
      {verdict}
    </span>
  );
}

export const VERDICT_ORDER = ["Потвърдено", "Частично вярно", "Подвеждащо", "Невярно", "Недостатъчно данни", "Прогноза", "Мнение"];
