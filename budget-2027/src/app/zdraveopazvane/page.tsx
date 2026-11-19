import type { Metadata } from "next";
import { RankedBars } from "@/components/charts/RankedBars";
import { QuoteBlock, StatTile, pct } from "@/components/fiscal/LawFigures";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, tableOf } from "@/lib/data/published";
import { lawSource } from "@/lib/data/view";
import { amount, nzokFunding, nzokPaymentShares } from "@/lib/social/derived";
import { QUOTES } from "@/lib/social/quotes";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Здравеопазване и бюджет на НЗОК 2027",
  description:
    "Бюджетът на Националната здравноосигурителна каса за 2027 г.: здравноосигурителни вноски, трансфери, болнична помощ, лекарства, първична и специализирана помощ, по внесения законопроект.",
  alternates: { canonical: "/zdraveopazvane" },
};

export default async function Health() {
  const data = await getPublished();
  const rev = tableOf(data, "nzokRevenue");
  const exp = tableOf(data, "nzokExpenditure");
  const src = lawSource(data, "ns-52-602-01-70-rtf");
  const fund = nzokFunding(rev);
  const pay = nzokPaymentShares(exp);
  const loc = "законопроект за бюджета на НЗОК 2027";
  // health insurance payments by type: items 1.1.3.1. … 1.1.3.8.
  const payments = exp.rows
    .filter((r) => /^1\.1\.3\.\d+\. /.test(r.label))
    .map((r) => ({ label: r.label.replace(/^\S+ (здравноосигурителни плащания за:? )?/, ""), value: r.cells["2027"]?.value ?? null, base: null }));
  return (
    <PageShell
      eyebrow="Здравеопазване и НЗОК"
      title="Здравеопазването и здравната каса"
      lead={
        <p>
          Бюджетът на Националната здравноосигурителна каса (НЗОК) се приема с отделен закон. Числата тук са от внесения в Народното събрание законопроект (вх. № 52-602-01-70, 16.11.2026 г.), в хиляди евро, както
          са отпечатани. Приходите и разходите са равни.
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        <StatTile label="Бюджет на НЗОК" value={amount(rev, "total")} source={`${loc}, чл. 1, ал. 1 и 2`} />
        <StatTile
          label="Здравноосигурителни вноски"
          value={amount(rev, "1.1.")}
          source={`${loc}, чл. 1, ал. 1, т. 1.1`}
          note={`${pct(fund.contributions.value)} от приходите и трансферите.`}
        />
        <StatTile
          label="Трансфери за здравно осигуряване"
          value={amount(rev, "1.2.")}
          source={`${loc}, чл. 1, ал. 1, т. 1.2`}
          note={`${pct(fund.stateInsured.value)} от приходите и трансферите.`}
        />
        <StatTile
          label="Болнична помощ"
          value={amount(exp, "1.1.3.7.")}
          source={`${loc}, чл. 1, ал. 2, т. 1.1.3.7`}
          note={`${pct(pay.hospital.value)} от бюджета на НЗОК. Лекарства, изделия и храни за домашно лечение: ${pct(pay.medicines.value)}.`}
        />
      </div>

      <Section id="plashtania" title="За какво плаща касата" lead="Чл. 1, ал. 2, т. 1.1.3: здравноосигурителни плащания по вид, хил. €. Сравнение с 2026 г. по пера има само в мотивите (виж по-долу).">
        <RankedBars title="Здравноосигурителни плащания, 2027" subtitle="Законопроект, хил. €" items={payments} unit="хил. €" valueLabel="2027 (проект)" baseLabel="—" />
        <TableView table={exp} sourceUrl={src.url} sourceTitle={src.title} searchable maxHeight="40rem" />
      </Section>

      <Section id="prihodi" title="Откъде идват парите" lead="Чл. 1, ал. 1.">
        <TableView table={rev} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>

      <Section id="motivi" title="Ръст спрямо 2026 г. според мотивите" lead="Дословни откъси от мотивите към законопроекта за бюджета на НЗОК. Сравнението е със закона за 2026 г.">
        <div className="flex max-w-3xl flex-col gap-5">
          <QuoteBlock quote={QUOTES.nzokRevenueGrowth} url={src.url} />
          <QuoteBlock quote={QUOTES.nzokExpenditureGrowth} url={src.url} />
          <QuoteBlock quote={QUOTES.nzokPaymentsGrowth} url={src.url} />
        </div>
        <p className="max-w-3xl text-sm text-ink-2">
          Разходите за функция „Здравеопазване“ в консолидираната фискална програма (страница „Разходи“) са с различен обхват и не се
          сравняват пряко с бюджета на НЗОК.
        </p>
      </Section>
    </PageShell>
  );
}
