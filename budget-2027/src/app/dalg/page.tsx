import type { Metadata } from "next";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { YearBars } from "@/components/charts/YearBars";
import { KpiTile } from "@/components/fiscal/KpiTile";
import { getPublished, seriesOf, tableOf } from "@/lib/data/published";
import { bars, billSource } from "@/lib/data/view";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Дълг 2027",
  description: "Държавният дълг, дългът по Маастрихт, лихвените разходи, таванът на новия дълг и структурата на дълга за 2025–2029 г.",
  alternates: { canonical: "/dalg" },
};

export default async function Debt() {
  const data = await getPublished();
  const S = (k: string) => seriesOf(data, k);
  const src = billSource(data);
  return (
    <PageShell
      eyebrow="Дълг"
      title="Дългът и цената му"
      lead={
        <p>
          Дългът е наличност в края на годината. Таванът на новия дълг е горна граница за заемане през годината: не е прогноза и включва
          рефинансиране. Лихвите са годишен разход.
        </p>
      }
      summary={
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile tone="lilac" size="lg" series={S("debt.government")} ratio={S("debt.government.pctGdp")} />
          <KpiTile tone="sky" series={S("esa.debt")} ratio={S("esa.debt.pctGdp")} />
          <KpiTile tone="mustard" series={S("kfp.expenditure.interest")} />
          <KpiTile tone="mint" series={S("debt.newDebtLimit")} base={null} />
        </div>
      }
    >
      <Section id="dinamika" title="2025–2029">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <YearBars title="Дълг, % от БВП" unitLabel="% от БВП" series={[bars("Държавен дълг", "series-1", S("debt.government.pctGdp")), bars("Дълг по ЕСС 2010", "series-2", S("esa.debt.pctGdp"))]} />
          <YearBars title="Държавен дълг: външен и вътрешен" unitLabel="млн. €" series={[bars("Външен", "series-1", S("debt.external")), bars("Вътрешен", "series-2", S("debt.domestic"))]} />
          <YearBars title="Лихвени разходи" subtitle="КФП, касова основа" unitLabel="млн. €" series={[bars("Лихви", "neutral", S("kfp.expenditure.interest"))]} />
        </div>
      </Section>
      <Section id="struktura" title="Структура на дълга" lead="Табл. VI-2: дялове в %, средна продължителност в години и месеци.">
        <TableView table={tableOf(data, "debtStructure")} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>
    </PageShell>
  );
}
