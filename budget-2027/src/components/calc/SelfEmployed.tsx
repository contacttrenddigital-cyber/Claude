"use client";

/** Self-insured contributions, 2026 vs 2027 (no income tax: its base is not in the project's sources). */
import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { selfEmployedYear } from "@/lib/calc/self-employed";
import { fmtNum, fmtSigned } from "@/lib/format";

const eur = (v: string) => `${fmtNum(v, 2)} €`;

export function SelfEmployed() {
  const [text, setText] = useState("1000");
  const [sick, setSick] = useState(false);
  const value = text.replace(/\s| /g, "").replace(",", ".");
  const ok = /^\d+(\.\d{1,2})?$/.test(value);
  const r = useMemo(() => (ok ? { a: selfEmployedYear(value, sick, 2026), b: selfEmployedYear(value, sick, 2027) } : null), [value, sick, ok]);
  const b = r?.b.periods[0];
  const a = r?.a.periods.at(-1);
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] [&>*]:min-w-0">
      <form className="flex flex-col gap-4 self-start rounded-3xl border border-rule bg-surface p-5 sm:p-6" onSubmit={(e) => e.preventDefault()}>
        <p className="text-lg font-semibold">Самоосигуряващ се</p>
        <label className="flex flex-col gap-1.5 text-[15px] font-medium">
          Осигурителен доход на месец, €
          <input
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={!ok}
            className="num min-h-14 w-full min-w-0 rounded-xl border border-rule-strong bg-surface px-4 text-2xl font-semibold text-ink"
          />
        </label>
        <p className="text-[13px] text-ink-2">Избираш го сам, между минималния (660 € за 2027 г.) и максималния осигурителен доход (2 400 €).</p>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={sick} onChange={(e) => setSick(e.target.checked)} />
          Осигурявам се и за общо заболяване и майчинство (+3,5 %)
        </label>
        <p className="text-[13px] text-ink-2">
          За еднолични търговци, собственици и съдружници, свободни професии, занаятчии и регистрирани земеделски стопани, родени след 31.12.1959 г.
          (НАП, категория 10).
        </p>
        {!ok && <p className="text-sm font-semibold text-adverse">Въведи сума в евро, напр. 1000 или 1000,50</p>}
      </form>

      {r && b && a && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="on-card flex flex-col gap-1 rounded-3xl bg-card-mustard p-5">
              <p className="text-sm font-semibold">Осигуровки на месец, 2027</p>
              <p className="num font-display text-[2.4rem] leading-none font-semibold">{eur(b.total)}</p>
              <p className="num text-sm">2026 (от 01.08): {eur(a.total)}</p>
            </div>
            <div className="on-card flex flex-col gap-1 rounded-3xl bg-card-sky p-5">
              <p className="text-sm font-semibold">За годината, 2027</p>
              <p className="num font-display text-[2.4rem] leading-none font-semibold">{eur(r.b.annual)}</p>
              <p className="num text-sm">
                2026: {eur(r.a.annual)} · разлика {fmtSigned(new Decimal(r.b.annual).minus(r.a.annual).toFixed(2), 2)} €
              </p>
            </div>
            <div className="on-card flex flex-col gap-1 rounded-3xl bg-card-lilac p-5">
              <p className="text-sm font-semibold">Върху доход</p>
              <p className="num font-display text-[2.4rem] leading-none font-semibold">{eur(b.base)}</p>
              <p className="text-sm">{b.adjusted === "min" ? "Под минимума: вноските са върху 660 €." : b.adjusted === "max" ? "Над максимума: вноските са върху 2 400 €." : "В границите за 2027 г."}</p>
            </div>
          </div>
          <table className="num w-full text-sm">
            <caption className="mb-2 text-left text-base font-semibold text-ink">Вноски за 2027 г. (предложено)</caption>
            <thead>
              <tr className="border-b border-rule-strong text-[13px] text-ink-2">
                <th scope="col" className="py-1.5 text-left font-normal">Вноска</th>
                <th scope="col" className="py-1.5 text-right font-normal">%</th>
                <th scope="col" className="py-1.5 text-right font-normal">На месец</th>
              </tr>
            </thead>
            <tbody>
              {b.lines.map((l) => (
                <tr key={l.label} className="border-b border-rule">
                  <th scope="row" className="py-1.5 text-left font-normal">{l.label}</th>
                  <td className="py-1.5 text-right">{fmtNum(l.pct, 1)}</td>
                  <td className="py-1.5 text-right">{eur(l.amount)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <th scope="row" className="py-1.5 text-left">Общо</th>
                <td />
                <td className="py-1.5 text-right">{eur(b.total)}</td>
              </tr>
            </tbody>
          </table>
          <p className="rounded-2xl border border-rule bg-surface p-4 text-sm text-ink-2">
            <strong className="text-ink">Данъкът не се изчислява.</strong> Облагаемият доход на самоосигуряващите се зависи от признатите разходи и
            годишната декларация, а тези правила не са в официалните документи, с които работим. Ставката е 10 %, а за стопанската дейност на
            едноличните търговци — 15 % (Приложение № 2 към мотивите).
          </p>
          <p className="text-xs text-ink-2">
            Източници: ставки — НАП, Приложение № 1 към изх. ВК-30-10237 от 12.08.2026 г., ред 10.1.2 и 10.2.2 (по СИГМА), непроменени за 2027 г.
            според Приложение № 2 към мотивите; прагове 2027 — законопроект за бюджета на ДОО, чл. 9, т. 2 и 3; прагове 2026 — ЗБДОО 2026.
          </p>
        </div>
      )}
    </div>
  );
}
