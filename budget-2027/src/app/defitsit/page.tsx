import type { Metadata } from "next";
import { PageShell, Section } from "@/components/site/PageShell";
import { YearBars } from "@/components/charts/YearBars";
import { KpiTile } from "@/components/fiscal/KpiTile";
import { getPublished, seriesOf } from "@/lib/data/published";
import { bars } from "@/lib/data/view";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Дефицит 2027",
  description: "Дефицитът по КФП (касова основа) и по ЕСС 2010 (начислена основа) за 2025–2029 г., в евро и като % от БВП, и критерият от 3% на ЕС.",
  alternates: { canonical: "/defitsit" },
};

export default async function Deficit() {
  const data = await getPublished();
  const S = (k: string) => seriesOf(data, k);
  return (
    <PageShell
      eyebrow="Дефицит"
      title="Дефицит: два различни показателя"
      lead={
        <p>
          Касовото салдо по КФП показва разликата между постъпилите и платените суми. Балансът по ЕСС 2010 е на начислена основа за сектор
          „Държавно управление“ и е показателят, по който ЕС следи критерия от 3%. За 2027 г. те са съответно −3,5% и −4,2% от БВП.
          Двата не се сравняват ред по ред.
        </p>
      }
      summary={
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiTile tone="rose" size="lg" series={S("kfp.balance")} ratio={S("kfp.balance.pctGdp")} />
          <KpiTile tone="rose" size="lg" series={S("esa.balance")} ratio={S("esa.balance.pctGdp")} />
          <KpiTile tone="sky" series={S("kfp.financing")} note="Финансирането покрива дефицита: равно по стойност и с обратен знак." />
        </div>
      }
    >
      <Section id="dinamika" title="2025–2029">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <YearBars
            title="Салдо, % от БВП"
            subtitle="Табл. II-5 (ЕСС) няма данни за 2025 г."
            unitLabel="% от БВП"
            series={[bars("КФП (касова основа)", "series-1", S("kfp.balance.pctGdp")), bars("ЕСС 2010 (начислена основа)", "series-2", S("esa.balance.pctGdp"))]}
            reference={{ value: -3, label: "−3% — референтна стойност на ЕС (за ЕСС)" }}
          />
          <YearBars title="Салдо, млн. €" unitLabel="млн. €" series={[bars("КФП", "series-1", S("kfp.balance")), bars("ЕСС 2010", "series-2", S("esa.balance"))]} />
        </div>
      </Section>
    </PageShell>
  );
}
