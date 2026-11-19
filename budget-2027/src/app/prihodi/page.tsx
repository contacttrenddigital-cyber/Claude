import type { Metadata } from "next";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { YearBars } from "@/components/charts/YearBars";
import { RankedBars } from "@/components/charts/RankedBars";
import { KpiTile } from "@/components/fiscal/KpiTile";
import { getPublished, seriesOf, tableOf } from "@/lib/data/published";
import { bars, billSource } from "@/lib/data/view";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Приходи 2027",
  description: "Приходите по консолидираната фискална програма за 2025–2029 г. по видове: данъци, осигуровки, неданъчни приходи, помощи от ЕС.",
  alternates: { canonical: "/prihodi" },
};

export default async function Revenue() {
  const data = await getPublished();
  const S = (k: string) => seriesOf(data, k);
  const t = tableOf(data, "kfpRevenue");
  const src = billSource(data);
  const items = t.rows
    .filter((r) => r.level === 1 && r.cells["2027"]?.value && !/^(от |помощи от)/.test(r.label))
    .map((r) => ({ label: r.label, value: r.cells["2027"]!.value, base: r.cells["2026"]?.value ?? null }));
  return (
    <PageShell
      eyebrow="Приходи"
      title="Откъде идват парите"
      lead={<p>Приходи, помощи и дарения по консолидираната фискална програма (КФП), касова основа. 2027 г. е проект, сравнен с очакваното изпълнение за 2026 г. от същия документ.</p>}
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile size="lg" series={S("kfp.revenue")} ratio={S("kfp.revenue.pctGdp")} />
        <KpiTile series={S("kfp.revenue.taxSocial")} />
        <KpiTile series={S("kfp.revenue.nonTax")} />
        <KpiTile series={S("kfp.revenue.grants")} note="Основно средства от ЕС. Спадът през 2027 г. е свързан с края на Плана за възстановяване и устойчивост." />
      </div>
      <Section id="struktura" title="Структура на приходите, 2027 срещу 2026">
        <RankedBars title="Приходи по видове" subtitle="КФП, млн. €. Маркерът показва очакваното изпълнение за 2026 г." items={items} unit="млн. €" valueLabel="2027 (проект)" baseLabel="2026 (очаквано)" />
      </Section>
      <Section id="dinamika" title="Динамика 2025–2029">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <YearBars title="Общо приходи" unitLabel="млн. €" series={[bars("Приходи", "series-1", S("kfp.revenue"))]} />
          <YearBars title="Приходи, % от БВП" unitLabel="% от БВП" series={[bars("Приходи", "series-1", S("kfp.revenue.pctGdp"))]} />
          <YearBars title="Осигурителни вноски (ДОО и здравни)" unitLabel="млн. €" series={[bars("Осигуровки", "series-1", S("kfp.revenue.social"))]} />
          <YearBars title="Помощи и дарения (основно ЕС)" unitLabel="млн. €" series={[bars("Помощи", "series-1", S("kfp.revenue.grants"))]} />
        </div>
      </Section>
      <Section id="tablitsa" title="Пълна таблица">
        <TableView table={t} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>
    </PageShell>
  );
}
