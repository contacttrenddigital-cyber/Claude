"use client";

/**
 * „Колко ще ми струва Бюджет 2027?“ — labour contract. Runs entirely in the browser:
 * inputs are not sent anywhere and are not stored. Sharing is opt-in and puts only the
 * form values in the URL.
 */
import { useEffect, useMemo, useState } from "react";
import { compareYears, PayrollInputError, type PayrollInput, type YearResult } from "@/lib/calc/payroll";
import { RATE_CITATIONS, RULES_2026, RULES_2027, type Citation } from "@/lib/calc/rules";
import { fmtNum, fmtSigned } from "@/lib/format";

const DEFAULTS: PayrollInput = {
  grossMonthly: "1500",
  bornBefore1960: false,
  tzpbPct: "0.4",
  children: 0,
  disabledChild: false,
  childDevelopmentExpenses: "0",
  monthlyAdvanceRelief: false,
};

const eur = (v: string) => `${fmtNum(v, 2)} €`;
const sEur = (v: string) => `${fmtSigned(v, 2)} €`;

function normalizeAmount(s: string): string {
  return s.replace(/\s| /g, "").replace(",", ".");
}

function fromQuery(q: URLSearchParams): Partial<PayrollInput> {
  const out: Partial<PayrollInput> = {};
  const g = q.get("bruto");
  if (g && /^\d+(\.\d{1,2})?$/.test(g)) out.grossMonthly = g;
  if (q.get("predi1960") === "1") out.bornBefore1960 = true;
  const t = q.get("tzpb");
  if (t && /^\d(\.\d)?$/.test(t)) out.tzpbPct = t;
  const c = Number(q.get("detsa"));
  if ([0, 1, 2, 3].includes(c)) out.children = c as PayrollInput["children"];
  if (q.get("uvrezhdane") === "1") out.disabledChild = true;
  if (q.get("avans") === "1") out.monthlyAdvanceRelief = true;
  const d = q.get("razhodi");
  if (d && /^\d+(\.\d{1,2})?$/.test(d)) out.childDevelopmentExpenses = d;
  return out;
}

export function Calculator({ docUrls }: { docUrls: Record<string, { url: string; title: string }> }) {
  const [form, setForm] = useState({ ...DEFAULTS, grossText: "1500", devText: "0" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const q = fromQuery(new URLSearchParams(window.location.search));
    if (Object.keys(q).length) setForm((f) => ({ ...f, ...q, grossText: q.grossMonthly ?? f.grossText, devText: q.childDevelopmentExpenses ?? f.devText }));
  }, []);

  const { result, error } = useMemo(() => {
    try {
      const input: PayrollInput = {
        ...form,
        grossMonthly: normalizeAmount(form.grossText) || "0",
        childDevelopmentExpenses: normalizeAmount(form.devText) || "0",
      };
      if (!/^\d+(\.\d+)?$/.test(input.grossMonthly)) throw new PayrollInputError("Въведи брутна заплата в евро, напр. 1500 или 1500,50");
      if (!/^\d+(\.\d+)?$/.test(input.childDevelopmentExpenses)) throw new PayrollInputError("Въведи сума в евро");
      return { result: compareYears(input, RULES_2026, RULES_2027), error: null };
    } catch (e) {
      if (e instanceof PayrollInputError) return { result: null, error: e.message };
      throw e;
    }
  }, [form]);

  function share() {
    const q = new URLSearchParams({ bruto: normalizeAmount(form.grossText), detsa: String(form.children), tzpb: form.tzpbPct });
    if (form.bornBefore1960) q.set("predi1960", "1");
    if (form.disabledChild) q.set("uvrezhdane", "1");
    if (form.monthlyAdvanceRelief) q.set("avans", "1");
    if (normalizeAmount(form.devText) !== "0") q.set("razhodi", normalizeAmount(form.devText));
    const url = `${window.location.origin}${window.location.pathname}?${q}`;
    window.history.replaceState(null, "", url);
    navigator.clipboard?.writeText(url).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setCopied(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] [&>*]:min-w-0">
      {/* ── Inputs ── */}
      <form className="flex flex-col gap-5 self-start rounded-3xl border border-rule bg-surface p-5 sm:p-6 lg:sticky lg:top-24" onSubmit={(e) => e.preventDefault()} aria-describedby="calc-privacy">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Твоите данни</legend>
          <label className="flex flex-col gap-1.5 text-[15px] font-medium">
            Брутна заплата на месец, €
            <input
              inputMode="decimal"
              autoComplete="off"
              value={form.grossText}
              onChange={(e) => set("grossText", e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "calc-error" : undefined}
              className="num min-h-14 w-full min-w-0 rounded-xl border border-rule-strong bg-surface px-4 text-2xl font-semibold text-ink focus:border-accent-fill"
            />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Бързи примери">
            {[
              { label: "1 500 €", gross: "1500", children: 0 },
              { label: "2 400 €", gross: "2400", children: 0 },
              { label: "3 000 €", gross: "3000", children: 0 },
              { label: "1 800 € и 2 деца", gross: "1800", children: 2 },
            ].map((x) => (
              <button
                key={x.label}
                type="button"
                onClick={() => {
                  setCopied(false);
                  setForm((f) => ({ ...f, grossText: x.gross, children: x.children as PayrollInput["children"], disabledChild: x.children === 0 ? false : f.disabledChild }));
                }}
                className={`min-h-10 rounded-full px-3.5 text-sm font-medium transition ${
                  normalizeAmount(form.grossText) === x.gross && form.children === x.children ? "bg-tile text-white" : "bg-surface-2 text-ink hover:bg-rule"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Брой ненавършили пълнолетие деца
            <select
              value={form.children}
              onChange={(e) => {
                const n = Number(e.target.value) as PayrollInput["children"];
                setForm((f) => ({ ...f, children: n, disabledChild: n === 0 ? false : f.disabledChild }));
              }}
              className="min-h-12 w-full min-w-0 rounded-xl border border-rule-strong bg-surface px-3 text-ink"
            >
              <option value={0}>няма</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3 или повече</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={form.disabledChild}
              disabled={form.children === 0}
              onChange={(e) => set("disabledChild", e.target.checked)}
            />
            Дете с 50 и над 50 на сто вид и степен на увреждане
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Разходи за здраве, образование и спорт на децата през годината, € (само за новото облекчение 2027)
            <input
              inputMode="decimal"
              autoComplete="off"
              value={form.devText}
              disabled={form.children === 0}
              onChange={(e) => set("devText", e.target.value)}
              className="num min-h-12 w-full min-w-0 rounded-xl border border-rule-strong bg-surface px-3 text-ink disabled:opacity-60"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={form.monthlyAdvanceRelief}
              disabled={form.children === 0}
              onChange={(e) => set("monthlyAdvanceRelief", e.target.checked)}
            />
            2027: ползвам облекчението за деца всеки месец чрез работодателя
          </label>
        </fieldset>
        <details className="text-sm">
          <summary className="inline-flex min-h-11 items-center underline decoration-rule-strong underline-offset-4">Още настройки</summary>
          <div className="mt-3 flex flex-col gap-4">
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="size-5" checked={form.bornBefore1960} onChange={(e) => set("bornBefore1960", e.target.checked)} />
              Роден/а преди 1 януари 1960 г. (без универсален пенсионен фонд)
            </label>
            <label className="flex flex-col gap-1">
              Вноска на работодателя за „Трудова злополука и професионална болест“, % (0,4–1,1 според дейността)
              <select
                value={form.tzpbPct}
                onChange={(e) => set("tzpbPct", e.target.value)}
                className="min-h-12 w-full min-w-0 rounded-xl border border-rule-strong bg-surface px-3 text-ink"
              >
                {["0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1", "1.1"].map((v) => (
                  <option key={v} value={v}>
                    {v.replace(".", ",")}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
        <p id="calc-privacy" className="text-xs text-muted">
          Изчислението става само в твоя браузър. Нищо не се изпраща и не се записва.
        </p>
        <button
          type="button"
          onClick={share}
          disabled={!result}
          className="min-h-11 self-start rounded-sm border border-rule-strong px-3 text-sm text-ink-2 hover:border-ink disabled:opacity-50"
        >
          {copied ? "Връзката е копирана" : "Копирай връзка към този сценарий"}
        </button>
        <p className="-mt-3 text-xs text-muted">Връзката съдържа въведените стойности. Сподели я само ако нямаш нищо против.</p>
      </form>

      {/* ── Phone: the answer stays visible while typing ── */}
      {result && (
        <a
          href="#sum-title"
          className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-3xl bg-card-mustard px-4 py-3 text-on-card shadow-2xl shadow-black/40 lg:hidden"
          aria-label={`Нетна заплата 2027: ${eur(result.y2027.periods[0]!.net)}, разлика ${sEur(result.monthlyDelta.net)} на месец. Към подробностите.`}
        >
          <span className="flex flex-col leading-tight">
            <span className="text-xs font-medium">Нето на месец, 2027</span>
            <span className="num font-display text-3xl font-semibold">{eur(result.y2027.periods[0]!.net)}</span>
          </span>
          <span className="flex flex-col items-end leading-tight">
            <span className="text-xs font-medium">{/^-?0(\.0+)?$/.test(result.monthlyDelta.net) ? "без промяна спрямо 2026" : "спрямо 2026"}</span>
            <span className="num rounded-full bg-tile px-2.5 py-0.5 text-base font-semibold text-white">{sEur(result.monthlyDelta.net)}</span>
          </span>
        </a>
      )}

      {/* ── Results ── */}
      <div className="flex flex-col gap-8" aria-live="polite">
        {error && (
          <p id="calc-error" role="alert" className="border-l-2 border-adverse bg-surface px-4 py-3 text-sm text-ink">
            {error}
          </p>
        )}
        {result && (
          <>
            <section aria-labelledby="sum-title" className="flex flex-col gap-4">
              <h2 id="sum-title" className="scroll-mt-24 text-xl font-semibold">
                Резултат за 2027 г.
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat
                  label="Нетна заплата на месец"
                  a={result.y2026.periods.at(-1)!.net}
                  b={result.y2027.periods[0]!.net}
                  delta={result.monthlyDelta.net}
                  note="2026: от 1 август; 2027: по законопроекта"
                />
                <Stat label="Нето за годината" a={result.y2026.annual.net} b={result.y2027.annual.net} delta={result.delta.net} note="след годишното изравняване на данъка" />
                <Stat
                  label="Разход на работодателя на месец"
                  a={result.y2026.periods.at(-1)!.employerCost}
                  b={result.y2027.periods[0]!.employerCost}
                  delta={result.monthlyDelta.employerCost}
                  note="бруто + осигуровки за сметка на работодателя"
                />
              </div>
              <p className="max-w-3xl text-sm text-ink-2">
                {explain(result)}
              </p>
              {[...new Set([...result.y2026.warnings, ...result.y2027.warnings])].map((w) => (
                <p key={w} className="border-l-2 border-warning bg-surface px-3 py-2 text-sm text-ink-2">
                  {w}
                </p>
              ))}
            </section>

            <section aria-labelledby="rec-title" className="flex flex-col gap-3">
              <h2 id="rec-title" className="text-xl font-semibold">
                Разбивка и равенство
              </h2>
              <YearTable y={result.y2026} title="2026 г. (в сила)" />
              <YearTable y={result.y2027} title="2027 г. (предложено)" />
            </section>

            <section aria-labelledby="src-title" className="flex flex-col gap-2 text-sm">
              <h2 id="src-title" className="text-xl font-semibold">
                Правила и източници
              </h2>
              <ul className="flex flex-col gap-2 text-ink-2">
                <SourceItem label="Ставки на осигурителните вноски и разпределение 60:40 (непроменени)" cites={RATE_CITATIONS} docUrls={docUrls} />
                <SourceItem label="Максимален осигурителен доход 2026" cites={RULES_2026.periods.flatMap((p) => p.maxInsurable.citations)} docUrls={docUrls} />
                <SourceItem label="Максимален осигурителен доход 2027: 2 400 €" cites={RULES_2027.periods[0]!.maxInsurable.citations} docUrls={docUrls} />
                <SourceItem label="Данък върху доходите 10 %" cites={RULES_2027.pitRate.citations} docUrls={docUrls} />
                <SourceItem label="Облекчения за деца 2026 → 2027" cites={[...RULES_2027.childRelief.one.citations, ...RULES_2027.disabledChildRelief.citations]} docUrls={docUrls} />
                <SourceItem label="Месечно ползване чрез работодателя (2027)" cites={[RULES_2027.monthlyAdvanceRelief!.citation]} docUrls={docUrls} />
                <SourceItem label="Облекчение за детско развитие (2027)" cites={[RULES_2027.childDevelopmentCap!.citation]} docUrls={docUrls} />
                <SourceItem label="Минимална работна заплата 620,20 € / 660 € (прогнозен размер)" cites={[...RULES_2026.periods[1]!.minWage.citations, ...RULES_2027.periods[0]!.minWage.citations]} docUrls={docUrls} />
              </ul>
              <h3 className="mt-3 font-semibold">Какво не е включено</h3>
              <ul className="list-disc pl-5 text-ink-2">
                <li>Минималният осигурителен доход по икономически дейности и професии (Приложение № 1 към закона за ДОО). Ако заплатата ти е под него, осигуровките се дължат върху минимума.</li>
                <li>Други категории труд (I и II категория, учители, държавни служители, военни), граждански договори, самоосигуряващи се, пенсионери.</li>
                <li>Други доходи и облекчения, болнични, отпуски, ваучери за храна и допълнителни възнаграждения.</li>
                <li>Годишният данък е изчислен с всички облекчения за цялата година при един работодател.</li>
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function explain(c: NonNullable<ReturnType<typeof compareYears>>) {
  const net = Number(c.delta.net);
  if (Math.abs(net) < 0.005) return "За този сценарий годишното нето е същото: ставките не се променят, а заплатата е под максималния осигурителен доход и няма деца.";
  const parts: string[] = [];
  const contr = Number(c.delta.employeeContributions);
  const tax = Number(c.delta.tax);
  if (Math.abs(contr) >= 0.005)
    parts.push(`осигуровките на работника ${contr > 0 ? "се увеличават" : "намаляват"} с ${eur(Math.abs(contr).toFixed(2))} (максималният осигурителен доход става 2 400 € срещу 2 111,64 € до юли и 2 300 € от август 2026 г.)`);
  if (Math.abs(tax) >= 0.005)
    parts.push(`данъкът ${tax > 0 ? "се увеличава" : "намалява"} с ${eur(Math.abs(tax).toFixed(2))}${c.y2027.annual.childRelief !== c.y2026.annual.childRelief || c.y2027.annual.childDevelopmentRelief !== "0.00" ? " (по-високи облекчения за деца" + (contr > 0 ? " и по-ниска данъчна основа заради осигуровките)" : ")") : ""}`);
  return `За годината: ${parts.join("; ")}. Нетният резултат е ${sEur(c.delta.net)}.`;
}

function Stat({ label, a, b, delta, note }: { label: string; a: string; b: string; delta: string; note: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-rule bg-surface p-4">
      <p className="text-[13px] font-medium text-ink-2">{label}</p>
      <p className="num text-3xl font-semibold tracking-tight">{eur(b)}</p>
      <p className="num text-sm text-ink-2">
        2026: {eur(a)} · разлика <strong className="text-ink">{sEur(delta)}</strong>
      </p>
      <p className="text-xs text-muted">{note}</p>
    </div>
  );
}

function YearTable({ y, title }: { y: YearResult; title: string }) {
  return (
    <details className="border-b border-rule pb-3" open={y.year === 2027}>
      <summary className="flex min-h-11 items-center font-medium">{title}</summary>
      {y.periods.map((p) => (
        <div key={p.from} className="mt-2 overflow-x-auto">
          <table className="num w-full text-sm">
            <caption className="py-1 text-left text-xs text-muted">
              Месец в периода {p.from.split("-").reverse().join(".")} – {p.to.split("-").reverse().join(".")} ({p.months} мес.) · осигурителен доход{" "}
              {eur(p.insurableBase)}
              {p.capped && " (достигнат максимум)"}
            </caption>
            <thead>
              <tr className="border-b border-rule-strong text-xs text-muted">
                <th scope="col" className="py-1 pr-2 text-left font-normal">
                  Перо
                </th>
                <th scope="col" className="py-1 pr-2 text-right font-normal">
                  Работник
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Работодател
                </th>
              </tr>
            </thead>
            <tbody>
              {p.lines.map((l) => (
                <tr key={l.key} className="border-b border-rule">
                  <th scope="row" className="py-1 pr-2 text-left font-normal">
                    {l.label}
                  </th>
                  <td className="py-1 pr-2 text-right">
                    {l.employeePct === "0" ? "—" : `${eur(l.employee)} (${fmtNum(l.employeePct, 2)} %)`}
                  </td>
                  <td className="py-1 text-right">
                    {eur(l.employer)} ({fmtNum(l.employerPct, 2)} %)
                  </td>
                </tr>
              ))}
              <tr className="border-b border-rule font-semibold">
                <th scope="row" className="py-1 pr-2 text-left">
                  Осигуровки общо
                </th>
                <td className="py-1 pr-2 text-right">{eur(p.employeeContributions)}</td>
                <td className="py-1 text-right">{eur(p.employerContributions)}</td>
              </tr>
            </tbody>
          </table>
          <dl className="num mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
            <dt>Бруто</dt>
            <dd className="text-right">{eur(p.gross)}</dd>
            <dt>− осигуровки на работника</dt>
            <dd className="text-right">{eur(p.employeeContributions)}</dd>
            {p.monthlyAdvanceRelief !== "0.00" && (
              <>
                <dt>− месечно облекчение за деца (само за данъчната основа)</dt>
                <dd className="text-right">{eur(p.monthlyAdvanceRelief)}</dd>
              </>
            )}
            <dt>= данъчна основа</dt>
            <dd className="text-right">{eur(p.taxBase)}</dd>
            <dt>− данък 10 %</dt>
            <dd className="text-right">{eur(p.tax)}</dd>
            <dt className="font-semibold">= нето (бруто − осигуровки − данък)</dt>
            <dd className="text-right font-semibold">{eur(p.net)}</dd>
          </dl>
        </div>
      ))}
      <dl className="num mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-t border-rule pt-2 text-sm">
        <dt>Годишно бруто</dt>
        <dd className="text-right">{eur(y.annual.gross)}</dd>
        <dt>Облекчение за деца (годишно)</dt>
        <dd className="text-right">{eur(y.annual.childRelief)}</dd>
        {y.annual.childDevelopmentRelief !== "0.00" && (
          <>
            <dt>Облекчение за детско развитие</dt>
            <dd className="text-right">{eur(y.annual.childDevelopmentRelief)}</dd>
          </>
        )}
        <dt>Годишен данък</dt>
        <dd className="text-right">{eur(y.annual.tax)}</dd>
        <dt>Изравняване с удържания месечно данък</dt>
        <dd className="text-right">{sEur(y.annual.taxSettlement)}</dd>
        <dt className="font-semibold">Годишно нето</dt>
        <dd className="text-right font-semibold">{eur(y.annual.net)}</dd>
        <dt>Годишен разход на работодателя</dt>
        <dd className="text-right">{eur(y.annual.employerCost)}</dd>
      </dl>
    </details>
  );
}

function SourceItem({ label, cites, docUrls }: { label: string; cites: Citation[]; docUrls: Record<string, { url: string; title: string }> }) {
  return (
    <li>
      <span className="text-ink">{label}</span>
      {cites.map((c, i) => (
        <span key={i} className="block text-xs text-muted">
          {docUrls[c.documentId] ? (
            <a className="underline underline-offset-2" href={docUrls[c.documentId]!.url} rel="noreferrer">
              {c.locator}
            </a>
          ) : (
            c.locator
          )}
          : „{c.quote}“
        </span>
      ))}
    </li>
  );
}
