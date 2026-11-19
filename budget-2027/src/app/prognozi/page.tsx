import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PageShell, Section } from "@/components/site/PageShell";
import { Waterfall } from "@/components/charts/Waterfall";
import { DocxExtract } from "@/lib/ingest/documents";
import { balanceBridge, revisions, type RevisionRow } from "@/lib/forecast/revisions";
import type { WaterfallStep } from "@/lib/data/derive";
import { fmtNum, fmtSigned, VINTAGE_SHORT } from "@/lib/format";
import Decimal from "decimal.js";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Прогнозите: как се промениха",
  description: "Сравнение на макроикономическата и фискалната прогноза от бюджета за 2026 г. (01.07.2026) и бюджета за 2027 г. (16.11.2026): ревизии и мост на дефицита.",
  alternates: { canonical: "/prognozi" },
};

const load = (f: string) => DocxExtract.parse(JSON.parse(readFileSync(join(process.cwd(), "data/extracted", `${f}.tables.json`), "utf8")));

function RevTable({ rows, years, caption }: { rows: RevisionRow[]; years: string[]; caption: string }) {
  const labels = [...new Set(rows.map((r) => r.label))];
  return (
    <div className="overflow-x-auto rounded-sm border border-rule" role="region" aria-label={caption} tabIndex={0}>
      <table className="num w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-rule-strong text-xs text-muted">
            <th scope="col" className="px-3 py-2 text-left font-normal">
              Показател
            </th>
            {years.map((y) => (
              <th key={y} scope="col" colSpan={3} className="px-3 py-2 text-center font-normal">
                {y}
              </th>
            ))}
          </tr>
          <tr className="border-b border-rule text-[11px] text-muted">
            <th scope="col" />
            {years.map((y) => (
              <th key={y} scope="col" colSpan={3} className="px-3 pb-1 text-center font-normal">
                юли 2026 → ноември 2026 (ревизия)
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l) => (
            <tr key={l} className="border-b border-rule">
              <th scope="row" className="px-3 py-1.5 text-left font-normal">
                {l}
              </th>
              {years.map((y) => {
                const r = rows.find((x) => x.label === l && x.year === y);
                const dp = r?.unit === "%" ? 1 : 1;
                return r ? (
                  <td key={y} colSpan={3} className="px-3 py-1.5 text-right whitespace-nowrap">
                    {r.oldValue === null ? "—" : fmtNum(r.oldValue, r.unit === "%" ? 1 : r.oldValue.includes(".") ? 1 : 0)} →{" "}
                    {r.newValue === null ? "—" : fmtNum(r.newValue, r.unit === "%" ? 1 : r.newValue.includes(".") ? 1 : 0)}{" "}
                    <strong className={r.revision && r.revision !== "0" ? "text-ink" : "text-muted"}>
                      ({r.revision === null ? "—" : fmtSigned(r.revision, dp)}
                      {r.unit === "%" ? " пр.п." : ""})
                    </strong>
                    <span className="block text-[10px] text-muted">
                      {VINTAGE_SHORT[r.oldVintage]} → {VINTAGE_SHORT[r.newVintage]}
                    </span>
                  </td>
                ) : (
                  <td key={y} colSpan={3} />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Forecasts() {
  const v = { old: load("52-602-01-19"), new: load("52-602-01-71") };
  const years = ["2026", "2027", "2028"];
  const macro = revisions(v, "macro", years);
  const kfp = revisions(v, "kfp", years);
  const b = balanceBridge(kfp, "2027");
  const D = (s: string) => new Decimal(s);
  const after1 = D(b.oldBalance).plus(b.revenueEffect);
  const after2 = after1.plus(b.expenditureEffect);
  const steps: WaterfallStep[] = [
    { key: "old", label: "Салдо 2027 — прогноза от юли 2026", value: b.oldBalance, start: "0", end: b.oldBalance, kind: "total" },
    { key: "rev", label: "По-високи приходи", value: b.revenueEffect, start: b.oldBalance, end: after1.toString(), kind: "inflow" },
    { key: "exp", label: "По-високи разходи", value: b.expenditureEffect, start: after1.toString(), end: after2.toString(), kind: "outflow" },
    { key: "res", label: "Остатък от закръгляне", value: b.residual, start: after2.toString(), end: after2.plus(b.residual).toString(), kind: D(b.residual).gte(0) ? "inflow" : "outflow" },
    { key: "new", label: "Салдо 2027 — проект от ноември 2026", value: b.newBalance, start: "0", end: b.newBalance, kind: "total" },
  ];
  return (
    <PageShell
      eyebrow="Прогнози"
      title="Как се промениха прогнозите"
      lead={
        <p>
          Сравняваме прогнозата в бюджета за 2026 г. (внесен в НС на 01.07.2026, вх. № 52-602-01-19) с тази в бюджета за 2027 г. (16.11.2026,
          вх. № 52-602-01-71) за едни и същи години. Показваме само ревизиите и счетоводното разлагане на дефицита. Документите не дават
          официално разлагане по причини (политики, икономика, технически промени), затова такова не измисляме.
        </p>
      }
    >
      <Section id="most" title="Защо прогнозата за дефицита за 2027 г. се промени?" lead="Салдо по КФП, млн. €. Ревизия на салдото = ревизия на приходите − ревизия на разходите.">
        <Waterfall steps={steps} unitLabel="млн. €" title="Мост на салдото по КФП за 2027 г." subtitle="Прогноза (юли 2026) → проект (ноември 2026)" />
        <p className="num text-sm text-ink-2">
          Салдото се подобрява с {fmtSigned(D(b.newBalance).minus(b.oldBalance).toString())} млн. €: приходите са ревизирани с{" "}
          {fmtSigned(b.revenueEffect)} млн. €, разходите с {fmtSigned(D(b.expenditureEffect).negated().toString())} млн. €; остатък{" "}
          {fmtSigned(b.residual)} млн. € от закръгляне в отпечатаните таблици.
        </p>
      </Section>
      <Section id="kfp" title="Фискални показатели (КФП)">
        <RevTable rows={kfp} years={years} caption="Ревизии на показателите по КФП, млн. €" />
      </Section>
      <Section id="makro" title="Макроикономическа прогноза">
        <RevTable rows={macro} years={years} caption="Ревизии на макроикономическата прогноза" />
        <p className="text-xs text-muted">
          Източници: Табл. I-2 и основните показатели по КФП в мотивите към двата законопроекта (Народно събрание). Етикетите
          (прогноза, проект, очакв.) са от самите документи. Оценки на несигурността не публикуваме: официални интервали няма.
        </p>
      </Section>
    </PageShell>
  );
}
