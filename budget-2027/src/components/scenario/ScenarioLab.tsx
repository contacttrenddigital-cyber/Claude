"use client";

import { useMemo, useState } from "react";
import { LINES, runScenario, ScenarioError, type Baseline, type LineKey } from "@/lib/scenario/model";
import { fmtNum, fmtSigned } from "@/lib/format";

export function ScenarioLab({ baseline }: { baseline: Baseline }) {
  const [pct, setPct] = useState<Partial<Record<LineKey, string>>>({});
  const [gdp, setGdp] = useState("0");
  const { r, err } = useMemo(() => {
    try {
      return { r: runScenario(baseline, { pct, gdpPct: gdp }), err: null };
    } catch (e) {
      if (e instanceof ScenarioError) return { r: null, err: e.message };
      throw e;
    }
  }, [baseline, pct, gdp]);

  const slider = (key: string, label: string, value: string, set: (v: string) => void, base?: string) => (
    <label key={key} className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-ink-2">
        {label}
        {base && <span className="num block text-xs text-muted">база {fmtNum(base)} млн. €</span>}
      </span>
      <span className="num text-right font-semibold">{fmtSigned(value, 0)}%</span>
      <input
        type="range"
        min={-30}
        max={30}
        step={1}
        value={value}
        onChange={(e) => set(e.target.value)}
        className="col-span-2 accent-[var(--series-1)]"
        aria-label={`${label}, промяна в %`}
      />
    </label>
  );

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] [&>*]:min-w-0">
      <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-semibold">Приходи</legend>
          {LINES.filter((l) => l.side === "revenue").map((l) => slider(l.key, l.label, pct[l.key] ?? "0", (v) => setPct((p) => ({ ...p, [l.key]: v })), baseline.lines[l.key]))}
        </fieldset>
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-semibold">Разходи</legend>
          {LINES.filter((l) => l.side === "expenditure").map((l) => slider(l.key, l.label, pct[l.key] ?? "0", (v) => setPct((p) => ({ ...p, [l.key]: v })), baseline.lines[l.key]))}
        </fieldset>
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-semibold">Икономика</legend>
          {slider("gdp", "Номинален БВП (променя само съотношенията)", gdp, setGdp, baseline.gdp)}
        </fieldset>
        <button type="button" onClick={() => (setPct({}), setGdp("0"))} className="min-h-11 self-start rounded-sm border border-rule-strong px-3 text-sm">
          Нулирай
        </button>
      </form>

      <div className="flex flex-col gap-4" aria-live="polite">
        {err && <p role="alert">{err}</p>}
        {r && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <article className="border-t border-rule-strong pt-3">
                <h3 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">Салдо по КФП, 2027</h3>
                <p className="num text-4xl font-semibold">
                  {fmtNum(r.balance)} <span className="text-base font-normal text-muted">млн. €</span>
                </p>
                <p className="num text-sm text-ink-2">
                  {fmtNum(r.balancePctGdp, 2)}% от БВП (база {fmtNum(r.baseBalancePctGdp, 2)}%) · промяна {fmtSigned(r.balanceDelta)} млн. €
                </p>
              </article>
              <article className="border-t border-rule-strong pt-3">
                <h3 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">Държавен дълг, края на 2027</h3>
                <p className="num text-4xl font-semibold">
                  {fmtNum(r.debt)} <span className="text-base font-normal text-muted">млн. €</span>
                </p>
                <p className="num text-sm text-ink-2">
                  {fmtNum(r.debtPctGdp, 2)}% от БВП (база {fmtNum(r.baseDebtPctGdp, 2)}%)
                </p>
              </article>
            </div>
            <table className="num w-full text-sm">
              <caption className="sr-only">Промени по пера, млн. €</caption>
              <thead>
                <tr className="border-b border-rule-strong text-xs text-muted">
                  <th scope="col" className="py-1 pr-3 text-left font-normal">
                    Перо
                  </th>
                  <th scope="col" className="py-1 pr-3 text-right font-normal">
                    База, млн. €
                  </th>
                  <th scope="col" className="py-1 text-right font-normal">
                    Промяна, млн. €
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.lineDeltas.map((l) => (
                  <tr key={l.key} className="border-b border-rule">
                    <th scope="row" className="py-1 pr-3 text-left font-normal">
                      {l.label}
                    </th>
                    <td className="py-1 pr-3 text-right">{fmtNum(l.base)}</td>
                    <td className="py-1 text-right">{fmtSigned(l.delta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted">
              Чиста аритметика: промяната на перо мести салдото точно със същата сума. Не са включени поведенчески и макроикономически
              ефекти (например по-високи данъци → по-малко потребление). Дългът се изменя с промяната на салдото, все едно цялата
              разлика се финансира с дълг. Това не е прогноза и не е гарантирана икономия.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
