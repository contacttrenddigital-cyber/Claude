"use client";

/** One programme: its 2027 budget next to its targets. Shown side by side; nothing is divided or ranked. */
import { useMemo, useState } from "react";
import { fmtNum } from "@/lib/format";

export interface ProgramOption {
  code: string;
  label: string;
  unit: string;
  budget2027: string | null;
}
export interface IndicatorItem {
  program: string;
  name: string;
  unit: string;
  kind: string;
  targets: Record<string, string>;
  page: string;
}

export function ResultsExplorer({ programs, indicators }: { programs: ProgramOption[]; indicators: IndicatorItem[] }) {
  const units = useMemo(() => [...new Set(programs.map((p) => p.unit))], [programs]);
  const [unit, setUnit] = useState(units.find((u) => /образованието/.test(u)) ?? units[0] ?? "");
  const inUnit = programs.filter((p) => p.unit === unit && indicators.some((i) => i.program === p.code));
  const [code, setCode] = useState<string>("");
  const prog = inUnit.find((p) => p.code === code) ?? inUnit[0];
  const list = prog ? indicators.filter((i) => i.program === prog.code) : [];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-[13px] text-ink-2">
          Институция
          <select
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              setCode("");
            }}
            className="min-h-11 max-w-full rounded-full border border-rule-strong bg-surface px-4 text-sm text-ink"
          >
            {units.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] text-ink-2">
          Програма
          <select value={prog?.code ?? ""} onChange={(e) => setCode(e.target.value)} className="min-h-11 w-full min-w-0 rounded-full border border-rule-strong bg-surface px-4 text-sm text-ink">
            {inUnit.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
            {inUnit.length === 0 && <option value="">няма разчетени показатели за програмите на тази институция</option>}
          </select>
        </label>
      </div>
      {prog && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] [&>*]:min-w-0">
          <div className="on-card flex flex-col gap-1 self-start rounded-3xl bg-card-mustard p-5">
            <p className="text-sm font-semibold">Пари за програмата, 2027</p>
            <p className="num font-display text-[2.4rem] leading-none font-semibold">
              {prog.budget2027 ? fmtNum(prog.budget2027, 1) : "няма данни"}
              {prog.budget2027 && <span className="ml-1.5 font-sans text-sm font-medium">хил. €</span>}
            </p>
            <p className="text-sm">„Общо разходи по бюджета“ на програмата, проект за 2027 г.</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">Цели на програмата ({list.length})</p>
            <ul className="flex flex-col gap-2">
              {list.map((i, k) => (
                <li key={k} className="rounded-2xl border border-rule bg-surface p-4">
                  <p className="text-[15px] font-medium text-ink">{i.name}</p>
                  <p className="mt-1 text-[13px] text-ink-2">
                    {i.kind === "полза/ефект" ? "Резултат (полза/ефект)" : "Показател за изпълнение"}
                    {i.unit && <> · {i.unit}</>} · {i.page}
                  </p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    {["2027", "2028", "2029"].map((y) => (
                      <div key={y} className="min-w-0 rounded-xl bg-surface-2 px-3 py-2">
                        <dt className="text-[12px] text-ink-2">Цел {y}</dt>
                        <dd className="num font-semibold break-words text-ink">{i.targets[y] || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
