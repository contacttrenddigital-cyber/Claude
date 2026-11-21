import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { RankedBars } from "@/components/charts/RankedBars";
import { KpiTile } from "@/components/fiscal/KpiTile";
import { getPublished, seriesOf, tableOf } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Разходи 2027",
  description: "Разходите по консолидираната фискална програма за 2026–2029 г. по функции (образование, здраве, отбрана, социални плащания) и по икономически вид.",
  alternates: { canonical: "/razhodi" },
};

export default async function Spending() {
  const data = await getPublished();
  const S = (k: string) => seriesOf(data, k);
  const f = tableOf(data, "functions");
  const e = tableOf(data, "kfpExpenditure");
  const d = tableOf(data, "defense");
  const src = billSource(data);
  const fx = (level: number) =>
    f.rows.filter((r) => r.level === level && r.kind === "data").map((r) => ({ label: r.label.replace(/^- /, ""), value: r.cells["2027"]?.value ?? null, base: r.cells["2026"]?.value ?? null }));
  return (
    <PageShell
      eyebrow="Разходи"
      title="Къде отиват парите"
      lead={
        <p>
          Разходи по КФП по функции и по икономически вид. Сборът на функциите съвпада с разходите по Приложение № 3 (проверка в{" "}
          <Link href="/iztochnitsi" className="underline underline-offset-2">
            източниците
          </Link>
          ). Вноската в бюджета на ЕС не е в разреза по функции.
        </p>
      }
      summary={
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile tone="sky" size="lg" series={S("kfp.expenditure")} ratio={S("kfp.expenditure.pctGdp")} />
          <KpiTile tone="mustard" series={S("kfp.expenditure.social")} />
          <KpiTile tone="mint" series={S("kfp.expenditure.personnel")} />
          <KpiTile tone="lilac" series={S("kfp.expenditure.capital")} ratio={S("kfp.expenditure.capital.pctGdp")} />
        </div>
      }
    >
      <Section id="funktsii" title="По функции, 2027 срещу 2026">
        <RankedBars title="Основни функции" subtitle="Табл. III-1, КФП, млн. €. Маркерът е очакваното изпълнение за 2026 г." items={fx(0)} unit="млн. €" valueLabel="2027 (проект)" baseLabel="2026 (очаквано)" />
        <RankedBars title="Подфункции" subtitle="Табл. III-1, КФП, млн. €" items={fx(1)} unit="млн. €" valueLabel="2027 (проект)" baseLabel="2026 (очаквано)" />
        <TableView table={f} collapsed sourceUrl={src.url} sourceTitle={src.title} />
      </Section>
      <Section id="ikonomicheski" title="По икономически вид" lead="Приложение № 3. „Текущи разходи“ включват лихвите.">
        <TableView table={e} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>
      <Section id="otbrana" title="Отбрана" lead="Табл. III-2: разходи за отбрана по класификацията на НАТО и по националния бюджет (последните два реда са % от БВП).">
        <TableView table={d} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>
    </PageShell>
  );
}
