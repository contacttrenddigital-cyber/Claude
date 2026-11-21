"use client";

/** Switch between income types. Only the types with official rates in the project's sources are calculated. */
import { useState } from "react";
import { Calculator, type ModActivity } from "./Calculator";
import { SelfEmployed } from "./SelfEmployed";

const MODES = [
  ["employment", "Трудов договор"],
  ["self", "Самоосигуряващ се"],
  ["other", "Пенсионер, граждански договор"],
] as const;

export function CalcModes({ docUrls, mod }: { docUrls: Record<string, { url: string; title: string }>; mod: ModActivity[] }) {
  const [mode, setMode] = useState<(typeof MODES)[number][0]>("employment");
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Вид доход" className="flex flex-wrap gap-2">
        {MODES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={mode === id}
            aria-controls={`panel-${id}`}
            onClick={() => setMode(id)}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
              mode === id ? "border-transparent bg-ink text-bg" : "border-rule-strong bg-surface text-ink hover:bg-surface-2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`}>
        {mode === "employment" && <Calculator docUrls={docUrls} mod={mod} />}
        {mode === "self" && <SelfEmployed />}
        {mode === "other" && (
          <div className="flex max-w-3xl flex-col gap-4 rounded-3xl border border-rule bg-surface p-5 sm:p-6 text-[15px] text-ink-2">
            <p className="text-lg font-semibold text-ink">Тези случаи още не изчисляваме</p>
            <p>
              <strong className="text-ink">Работещ пенсионер.</strong> В таблицата на НАП с осигурителните вноски по видове осигурени лица няма отделен ред
              за пенсионери, а правилата за осигуряването им (КСО, Закон за здравното осигуряване) не са в официалните документи, с които работим.
            </p>
            <p>
              <strong className="text-ink">Граждански договор.</strong> Ставките на вноските за лицата, работещи без трудово правоотношение, са в таблицата
              на НАП, но данъчната основа (нормативно признатите разходи по ЗДДФЛ) и прагът, над който се дължат осигуровки, не са в нашите източници.
            </p>
            <p>Не показваме приблизителни числа. Когато добавим официалния текст на законите, тези случаи ще се изчисляват със същите проверки.</p>
          </div>
        )}
      </div>
    </div>
  );
}
