import type { Metadata } from "next";
import { YearBars } from "@/components/charts/YearBars";
import { QuoteBlock, StatTile } from "@/components/fiscal/LawFigures";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource, rowBars } from "@/lib/data/view";
import { fmtNum, fmtSigned } from "@/lib/format";
import { defenseGap } from "@/lib/social/defense";
import { QUOTES } from "@/lib/social/quotes";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Отбрана 2027",
  description: "Разходите за отбрана за 2026–2029 г. по класификацията на НАТО и по бюджета на Министерството на отбраната, в евро и като % от БВП, по законопроекта за бюджет 2027.",
  alternates: { canonical: "/otbrana" },
};

const NATO = "Разходи за отбрана, съгласно класификацията на НАТО";
const MO = "Общо разходи по бюджета на МО";

export default async function Defense() {
  const data = await getPublished();
  const d = tableOf(data, "defense");
  const src = billSource(data);
  const cap = "Табл. III-2";
  const row = (prefix: string) => d.rows.find((r) => r.label.startsWith(prefix))!;
  const natoPct = row("Разходи за отбрана, съгласно класификацията на НАТО като % от БВП");
  const planPct = row("Разходи за отбрана по Националния план");
  const vals = (r: typeof natoPct) => Object.fromEntries(d.columns.map((c) => [c.period, r.cells[c.key]?.value ?? null]));
  const gaps = defenseGap(vals(natoPct), vals(planPct));
  const pctRow = (r: typeof natoPct, name: string, color: "series-1" | "series-2") => ({
    name,
    color,
    points: d.columns.map((c) => ({ period: c.period, value: r.cells[c.key]?.value ?? null, vintage: c.vintage, source: cap })),
  });
  const g27 = gaps.find((g) => g.period === "2027")!;
  return (
    <PageShell
      eyebrow="Отбрана"
      title="Разходите за отбрана"
      lead={
        <p>
          Табл. III-2 от мотивите дава разходите за отбрана по класификацията на НАТО (бюджетът на МО и отбранителните разходи на други
          институции) и като % от БВП. За 2026 г. стойностите са по закона, за 2027 г. са проект, за 2028–2029 г. са прогноза.
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 [&>*]:min-w-0">
        <StatTile label="Отбрана по НАТО" value={row(NATO).cells["2027"]!.value} unit="млн. €" show="млн. €" source={`${cap}, мотиви към ЗДБРБ 2027`} note={`${fmtNum(natoPct.cells["2027"]!.value, 2)}% от БВП.`} />
        <StatTile label="Бюджет на МО" value={row(MO).cells["2027"]!.value} unit="млн. €" show="млн. €" source={`${cap}, мотиви към ЗДБРБ 2027`} />
        <StatTile
          label="Спрямо националния план"
          value={g27.gap === null ? null : g27.gap.toString()}
          unit="пр.п."
          show="пр.п."
          dp={2}
          signed
          tag="2027 · % от БВП"
          source={`${cap}, последните два реда (разлика)`}
          note={`Разчет по НАТО ${fmtNum(g27.nato!, 2)}% срещу ${fmtNum(g27.plan!, 2)}% в реда за Националния план (РМС № 448/11.06.2026 г.).`}
        />
      </div>

      <Section id="dinamika" title="2026–2029">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <YearBars
            title="Разходи за отбрана"
            subtitle="По класификацията на НАТО и бюджетът на МО, млн. €"
            unitLabel="млн. €"
            series={[rowBars("По класификацията на НАТО", "series-1", d, NATO, cap), rowBars("Бюджет на МО", "series-2", d, MO, cap)]}
          />
          <YearBars
            title="Като % от БВП"
            subtitle="Разчет по НАТО и ред „Национален план“ в същата таблица"
            unitLabel="% от БВП"
            decimals={2}
            series={[pctRow(natoPct, "Разчет по НАТО", "series-1"), pctRow(planPct, "Национален план", "series-2")]}
          />
        </div>
        <div className="max-w-3xl overflow-x-auto">
          <table className="num w-full text-sm">
            <caption className="mb-2 text-left text-base font-semibold text-ink">Разлика между двата реда, пр.п.</caption>
            <thead>
              <tr className="border-b border-rule-strong text-xs text-muted">
                <th scope="col" className="py-1 pr-3 text-left font-normal">
                  Година
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-normal">
                  НАТО, % БВП
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-normal">
                  Национален план, % БВП
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Разлика
                </th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((g) => (
                <tr key={g.period} className="border-b border-rule">
                  <th scope="row" className="py-1 pr-3 text-left font-normal">
                    {g.period}
                  </th>
                  <td className="py-1 pr-3 text-right">{g.nato === null ? "—" : `${fmtNum(g.nato, 2)}%`}</td>
                  <td className="py-1 pr-3 text-right">{g.plan === null ? "—" : `${fmtNum(g.plan, 2)}%`}</td>
                  <td className="py-1 text-right">{g.gap === null ? "—" : fmtSigned(g.gap, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">
            Разликата е изчислена от отпечатаните стойности в Табл. III-2. Мотивите не обясняват разликата между двата реда в тази таблица.
          </p>
        </div>
      </Section>

      <Section id="tablitsa" title="Цялата таблица" lead="Сборът на МО, ДВВУ, централния бюджет и другите разпоредители е равен на общото по НАТО за всяка година (проверка в източниците).">
        <TableView table={d} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>

      <Section id="motivi" title="Какво казват мотивите">
        <div className="flex max-w-3xl flex-col gap-5">
          <QuoteBlock quote={QUOTES.defenseTarget} url={src.url} />
          <QuoteBlock quote={QUOTES.defenseHague} url={src.url} />
        </div>
      </Section>
    </PageShell>
  );
}
