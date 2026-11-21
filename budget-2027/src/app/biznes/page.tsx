import type { Metadata } from "next";
import Link from "next/link";
import { MeasuresExplorer } from "@/components/dashboard/MeasuresExplorer";
import { QuoteBlock } from "@/components/fiscal/LawFigures";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, seriesOf, tableOf } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";
import { QUOTES } from "@/lib/social/quotes";
import { KpiTile } from "@/components/fiscal/KpiTile";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Бизнес и бюджет 2027: данъци и мерки за фирмите",
  description:
    "Корпоративен данък, данък върху дивидентите, еднократен данък върху свръхпечалбата, ваучери за храна, разходи в натура, акциз върху мощни автомобили и осигурителни прагове за 2027 г.",
  alternates: { canonical: "/biznes" },
};

/** Measures whose title names a business tax or charge (editorial selection, by title). */
const BUSINESS = /ЗКПО|свръхпечал|фактурир|ваучери|натура|тол такс|концесион|автомобили|прага за регистрация|регистрация по ЗДДС|хазарт|селското стопанство|КД и ДДФЛ/;

/** Приложение № 2 rows that apply to companies and employers. */
const ROWS = [8, 9, 15, 17, 18, 20, 21, 22, 24, 26, 61, 62, 63, 64, 65, 66, 85, 86, 89];

export default async function Business() {
  const data = await getPublished();
  const a = tableOf(data, "assumptions");
  const src = billSource(data);
  const measures = data.measures.filter((m) => BUSINESS.test(m.title));
  const S = (k: string) => seriesOf(data, k);
  return (
    <PageShell
      eyebrow="Бизнес"
      title="Какво променя бюджетът за фирмите"
      lead={
        <p>
          Ставките на корпоративния данък (10%) и на данъка върху дивидентите (5%) остават същите. Новото е еднократен данък върху
          свръхпечалбата за определени сектори, по-висок данък върху разходите в натура, облагане на ваучерите за храна над 102,26 € и акциз
          за леки автомобили с мощност на двигателя с вътрешно горене 250 kW или повече. Колко струва един служител на работодателя, виж в{" "}
          <Link href="/kalkulator" className="underline underline-offset-2">
            калкулатора
          </Link>
          .
        </p>
      }
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 [&>*]:min-w-0">
          <KpiTile tone="sky" series={S("kfp.revenue.cit")} />
          <KpiTile tone="mustard" series={S("kfp.revenue.excise")} />
        </div>
      }
    >
      <Section id="stavki" title="Данъци и прагове, 2026 срещу 2027" lead="Приложение № 2 към мотивите. Маркирани са редовете с различна стойност за 2027 г.">
        <TableView table={a} only={ROWS} columns={["2026", "2027", "2028", "2029"]} sourceUrl={src.url} sourceTitle={src.title} highlightChanges={["2026", "2027"]} />
      </Section>

      <Section id="merki" title="Мерки с ефект за фирмите" lead="Табл. II-7: приходни мерки, свързани с данъци и такси, които плащат фирмите. Подбор по заглавието на мярката; пълният списък е на началната страница.">
        <MeasuresExplorer measures={measures} />
      </Section>

      <Section id="motivi" title="Какво казват мотивите">
        <div className="flex max-w-3xl flex-col gap-5">
          <QuoteBlock quote={QUOTES.windfallTax} url={src.url} />
          <QuoteBlock quote={QUOTES.vouchers} url={src.url} />
          <QuoteBlock quote={QUOTES.carExcise} url={src.url} />
          <QuoteBlock quote={QUOTES.corporateForecast} url={src.url} />
        </div>
      </Section>
    </PageShell>
  );
}
