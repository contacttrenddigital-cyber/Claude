"use client";

/** Segmented control (radio group): one choice out of a few, like "2026 · 2027". */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "light",
}: {
  label: string;
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  tone?: "light" | "dark";
}) {
  const track = tone === "dark" ? "bg-white/10" : "bg-surface-2";
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex w-full rounded-full p-1 sm:w-auto ${track}`}>
      {options.map((o) => {
        const on = o.value === value;
        const cls = on
          ? tone === "dark"
            ? "bg-white text-[#111216] shadow-sm"
            : "bg-surface text-ink shadow-sm"
          : tone === "dark"
            ? "text-white/75 hover:text-white"
            : "text-muted hover:text-ink";
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-10 flex-1 flex-col items-center justify-center rounded-full px-4 text-sm font-medium transition sm:flex-none ${cls}`}
          >
            <span>{o.label}</span>
            {o.hint && <span className="text-[11px] leading-none">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
