import type { Metadata } from "next";
import Link from "next/link";
import { YearBars } from "@/components/charts/YearBars";
import { KpiTile } from "@/components/fiscal/KpiTile";
import { QuoteBlock, StatTile } from "@/components/fiscal/LawFigures";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, seriesOf, tableOf } from "@/lib/data/published";
import { billSource, rowBars } from "@/lib/data/view";
import { fmtNum } from "@/lib/format";
import { QUOTES } from "@/lib/social/quotes";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Заплати 2027: минимална заплата и разходи за персонал",
  description: "Минималната работна заплата, разходите за персонал в публичния сектор (КФП) и политиката по доходите за 2027 г. по законопроекта за бюджет 2027.",
  alternates: { canonical: "/zaplati" },
};

const PAY_MEASURES = /персонал|педагогическия|МРЗ/;

export default async function Wages() {
  const data = await getPublished();
  const e = tableOf(data, "kfpExpenditure");
  const a = tableOf(data, "assumptions");
  const src = billSource(data);
  const mrz = a.rows.find((r) => r.label === "Размер на минималната работна заплата")!;
  const staff = e.rows.find((r) => r.label === "Персонал")!;
  const measures = data.measures.filter((m) => PAY_MEASURES.test(m.title));
  return (
    <PageShell
      eyebrow="Заплати"
      title="Заплатите в бюджета"
      lead={
        <p>
          Бюджетът засяга заплатите по два начина: определя минималната работна заплата и планира разходите за персонал в публичния сектор.
          Колко получаваш нетно при дадена брутна заплата, виж в{" "}
          <Link href="/kalkulator" className="underline underline-offset-2">
            калкулатора
          </Link>
          .
        </p>
      }
      summary={
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          <StatTile tone="sky"
            label="Минимална работна заплата"
            value={mrz.cells["2027"]!.value}
            unit="€"
            show="€"
            dp={2}
            tag="от 1.01.2027"
            source="Приложение № 2 към мотивите"
            note={`При ${fmtNum(mrz.cells["2026"]!.value, 2)} € за 2026 г.`}
          />
          <StatTile tone="mustard" label="Разходи за персонал (КФП)" value={staff.cells["2027"]!.value} unit="млн. €" source="Приложение № 3, КФП" note="Заплати, други възнаграждения и осигурителни вноски на заетите в публичния сектор." />
          <KpiTile tone="mint" series={seriesOf(data, "macro.compensation")} />
        </div>
      }
    >

      <Section id="dinamika" title="2025–2029">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <YearBars
            title="Разходи за персонал по КФП"
            subtitle="Персонал общо и от тях заплати, млн. €"
            unitLabel="млн. €"
            series={[rowBars("Персонал", "series-1", e, "Персонал", "Приложение № 3"), rowBars("Заплати", "series-2", e, "Заплати", "Приложение № 3")]}
          />
          <YearBars
            title="Минимална работна заплата"
            subtitle="€ на месец; 2028–2029 г. са прогноза"
            unitLabel="€"
            decimals={2}
            series={[rowBars("МРЗ", "neutral", a, "Размер на минималната работна заплата", "Приложение № 2")]}
          />
        </div>
      </Section>

      <Section id="politika" title="Политика по доходите" lead="Дословни откъси от мотивите. Едновременно има увеличение с 5% и целогодишен ефект от намалението с 10% от 1.09.2026 г.; мотивите изброяват изключенията.">
        <div className="flex max-w-3xl flex-col gap-5">
          <QuoteBlock quote={QUOTES.minimumWage} url={src.url} />
          <QuoteBlock quote={QUOTES.payRise} url={src.url} />
          <QuoteBlock quote={QUOTES.teachersPay} url={src.url} />
          <QuoteBlock quote={QUOTES.payCut} url={src.url} />
          <QuoteBlock quote={QUOTES.payCutSecurity} url={src.url} />
        </div>
      </Section>

      <Section id="merki" title="Мерки, свързани със заплатите" lead="Табл. II-7 и II-8: ефект за бюджета на начислена основа, млн. €. Подбор по заглавието на мярката.">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Мерки, свързани със заплатите (таблица)">
          <table className="num w-full min-w-[32rem] text-sm">
            <caption className="sr-only">Мерки, свързани със заплатите</caption>
            <thead>
              <tr className="border-b border-rule-strong text-xs text-muted">
                <th scope="col" className="py-1 pr-3 text-left font-normal">
                  Мярка
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-normal">
                  2027
                </th>
                <th scope="col" className="py-1 text-left font-normal">
                  Източник
                </th>
              </tr>
            </thead>
            <tbody>
              {measures.map((m) => (
                <tr key={m.id} className="border-b border-rule">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                    {m.title}
                  </th>
                  <td className="py-1.5 pr-3 text-right">{m.effect2027 === null ? "—" : fmtNum(m.effect2027, 1)}</td>
                  <td className="py-1.5 text-left text-xs text-muted">{m.locator.split(" (")[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="parametri" title="Осигурителни прагове" lead="Приложение № 2, редове 67, 85 и 86.">
        <TableView table={a} only={[67, 85, 86]} columns={["2026", "2027", "2028", "2029"]} sourceUrl={src.url} sourceTitle={src.title} highlightChanges={["2026", "2027"]} />
      </Section>
    </PageShell>
  );
}
