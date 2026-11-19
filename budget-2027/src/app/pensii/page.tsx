import type { Metadata } from "next";
import Link from "next/link";
import { RankedBars } from "@/components/charts/RankedBars";
import { QuoteBlock, StatTile, pct } from "@/components/fiscal/LawFigures";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource, lawSource } from "@/lib/data/view";
import { fmtNum } from "@/lib/format";
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
  const loc = "законопроект за бюджета на ДОО 2027";
  const composition = exp.rows
    .filter((r) => r.level === 1 && /^1\.\d+\. /.test(r.label))
    .map((r) => ({ label: r.label.replace(/^\S+ /, ""), value: r.cells["2027"]?.value ?? null, base: null }));
  return (
    <PageShell
      eyebrow="Пенсии и ДОО"
      title="Пенсии и общественото осигуряване"
      lead={
        <>
          <p>
            Пенсиите и обезщетенията се плащат от бюджета на държавното обществено осигуряване (ДОО). Той се приема с отделен закон, не е част от
            държавния бюджет, но влиза в консолидираната фискална програма. Числата тук са от внесения в Народното събрание законопроект (вх. №
            52-602-01-68, 16.11.2026 г.), в хиляди евро, както са отпечатани.
          </p>
          <p>
            Консолидираният бюджет на ДОО е със салдо 0,0. Сред приходите му има ред „Получени допълнителни трансфери от централния/държавния
            бюджет за покриване на недостига от средства“.
          </p>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        <StatTile label="Бюджет на ДОО" value={amount(rev, "total")} source={`${loc}, чл. 1, ал. 1 и 2`} note="Приходите и разходите са равни (салдо 0,0)." />
        <StatTile label="Пенсии" value={amount(exp, "1.1.")} source={`${loc}, чл. 1, ал. 2, т. 1.1`} note={`${pct(ps.value)} от разходите и трансферите на ДОО.`} />
        <StatTile
          label="Осигурителни приходи"
          value={amount(rev, "1.")}
          source={`${loc}, чл. 1, ал. 1, т. 1`}
          note={`${pct(fund.contributions.value)} от приходите и трансферите.`}
        />
        <StatTile
          label="Трансфери от централния бюджет"
          value={fund.central.part}
          source={`${loc}, чл. 1, ал. 1, т. 4 и 5 (сбор)`}
          note={`${pct(fund.central.value)} от приходите и трансферите. От тях ${fmtNum(amount(rev, "5."), 1)} хил. € са „за покриване на недостига“.`}
        />
      </div>

      <Section id="razhodi" title="За какво харчи ДОО" lead="Чл. 1, ал. 2: разходи по основни пера, хил. €. Сравнение с 2026 г. в този законопроект няма.">
        <RankedBars title="Разходи на ДОО, 2027" subtitle="Законопроект, хил. €" items={composition} unit="хил. €" valueLabel="2027 (проект)" baseLabel="—" />
        <TableView table={exp} sourceUrl={src.url} sourceTitle={src.title} />
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
