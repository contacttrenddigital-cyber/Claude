import type { Metadata } from "next";
import Link from "next/link";
import { RankedBars } from "@/components/charts/RankedBars";
import { QuoteBlock, pct } from "@/components/fiscal/LawFigures";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource, lawSource } from "@/lib/data/view";
import { rescale } from "@/lib/format";
import { amount, dooFunding, dooPensionsShare } from "@/lib/social/derived";
import { QUOTES } from "@/lib/social/quotes";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Пенсии и бюджет на ДОО 2027",
  description:
    "Бюджетът на държавното обществено осигуряване за 2027 г.: пенсии, обезщетения, фондове, осигурителни приходи и трансфери от централния бюджет, по внесения законопроект.",
  alternates: { canonical: "/pensii" },
};

export default async function Pensions() {
  const data = await getPublished();
  const rev = tableOf(data, "dooRevenue");
  const exp = tableOf(data, "dooExpenditure");
  const funds = tableOf(data, "dooFunds");
  const pf = tableOf(data, "dooPensionsFund");
  const src = lawSource(data, "ns-52-602-01-68-rtf");
  const bill = billSource(data);
  const fund = dooFunding(rev);
  const ps = dooPensionsShare(exp);
  const composition = exp.rows
    .filter((r) => r.level === 1 && /^1\.\d+\. /.test(r.label))
    .map((r) => ({ label: r.label.replace(/^\S+ /, ""), value: r.cells["2027"]?.value ?? null, base: null }));
  return (
    <PageShell
      eyebrow="Пенсии и ДОО"
      title="Пенсии и общественото осигуряване"
      lead={
        <p>
          Пенсиите и обезщетенията се плащат от бюджета на държавното обществено осигуряване (ДОО). Той се приема с отделен закон. Числата са от
          внесения законопроект (НС, вх. № 52-602-01-68).
        </p>
      }
      facts={[
        { label: "Бюджет на ДОО", value: rescale(amount(rev, "total"), "хил. €", "млн. €"), unit: "млн. €", tone: "mustard", note: "Приходите и разходите са равни." },
        { label: "Пенсии", value: rescale(amount(exp, "1.1."), "хил. €", "млн. €"), unit: "млн. €", tone: "sky", note: `${pct(ps.value)} от всички разходи на ДОО.` },
        {
          label: "Трансфери от централния бюджет",
          value: rescale(fund.central.part, "хил. €", "млн. €"),
          unit: "млн. €",
          tone: "violet",
          note: `${pct(fund.central.value)} от приходите; осигурителните вноски покриват ${pct(fund.contributions.value)}.`,
        },
      ]}
      factsSource="законопроект за бюджета на ДОО 2027, чл. 1, ал. 1 и 2 (т. 1.1; т. 4 и 5 — сбор). Дяловете са изчислени от отпечатаните стойности."
    >
      <Section id="razhodi" title="За какво харчи ДОО" lead="Чл. 1, ал. 2: разходи по основни пера, хил. €. Сравнение с 2026 г. в този законопроект няма.">
        <RankedBars title="Разходи на ДОО, 2027" subtitle="Законопроект, хил. €" items={composition} unit="хил. €" valueLabel="2027 (проект)" baseLabel="—" />
        <TableView table={exp} collapsed sourceUrl={src.url} sourceTitle={src.title} />
      </Section>

      <Section id="prihodi" title="Откъде идват парите" lead="Чл. 1, ал. 1. Осигурителните вноски покриват малко над половината; останалото са основно трансфери от централния бюджет.">
        <TableView table={rev} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>

      <Section
        id="fondove"
        title="Фондовете"
        lead="Чл. 1–8, ал. 1–3. Не събирай редовете: фондовете и НОИ си превеждат средства помежду си, а консолидираният бюджет (чл. 1) ги отчита веднъж. Дефицитът на фонд „Пенсии“ не е дефицит на ДОО като цяло."
      >
        <TableView table={funds} sourceUrl={src.url} sourceTitle={src.title} />
        <TableView table={pf} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>

      <Section id="politika" title="Какво казват мотивите" lead="Дословни откъси от мотивите към законопроекта за държавния бюджет (раздел „Пенсионна политика“ и „Социална политика“).">
        <div className="flex max-w-3xl flex-col gap-5">
          <QuoteBlock quote={QUOTES.pensionGrowth} url={bill.url} />
          <QuoteBlock quote={QUOTES.pensionGrowthLater} url={bill.url} />
          <QuoteBlock quote={QUOTES.pensionIndexation} url={bill.url} />
          <QuoteBlock quote={QUOTES.pensionConditions} url={bill.url} />
          <QuoteBlock quote={QUOTES.unemploymentBenefit} url={bill.url} />
          <QuoteBlock quote={QUOTES.childcareBenefit} url={bill.url} />
        </div>
        <p className="max-w-3xl text-sm text-ink-2">
          Минималната пенсия, социалната пенсия и другите размери за 2026–2029 г. са в{" "}
          <Link href="/osigurovki#sotsialni" className="underline underline-offset-2">
            Осигуровки и социални плащания
          </Link>
          . Как промените засягат заплатата, виж в{" "}
          <Link href="/kalkulator" className="underline underline-offset-2">
            калкулатора
          </Link>
          .
        </p>
      </Section>
    </PageShell>
  );
}
