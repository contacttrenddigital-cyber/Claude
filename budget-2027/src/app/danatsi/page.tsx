import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { YearBars } from "@/components/charts/YearBars";
import { changedRows, rowsInRange } from "@/lib/data/assumptions";
import { getPublished, seriesOf, tableOf } from "@/lib/data/published";
import { bars, billSource } from "@/lib/data/view";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Данъци 2027: какво се променя",
  description: "Ставки на ДДС, корпоративен данък, данък върху доходите, акцизи и други данъци за 2026–2029 г. по законопроекта за бюджет 2027, с промените и тяхната оценка от МФ.",
  alternates: { canonical: "/danatsi" },
};

export default async function Taxes() {
  const data = await getPublished();
  const a = tableOf(data, "assumptions");
  const taxRows = rowsInRange(a, 1, 9);
  const changed = changedRows(a).filter((r) => taxRows.includes(r.rowIndex));
  const src = billSource(data);
  const S = (k: string) => seriesOf(data, k);
  return (
    <PageShell
      eyebrow="Данъци"
      title="Данъци 2027: какво се променя"
      lead={
        <p>
          Основните ставки на ДДС (20%), корпоративния данък (10%) и данъка върху доходите (10%) не се променят. Променят се акцизите
          върху тютюна и колите над 250 kW, данъкът върху разходите в натура (3% → 7%), облагането на ваучерите за храна (нов окончателен данък 7%) и мерките в областта на хазарта.
          Числата са от Приложение № 2 и Табл. II-7 на мотивите; законопроектът не е приет.
        </p>
      }
    >
      <Section id="promeni" title={`Какво се променя (${changed.length} реда)`} lead="Редове от Приложение № 2, в които стойността за 2027 г. е различна от 2026 г.">
        <TableView table={a} only={changed.map((r) => r.rowIndex)} columns={["2026", "2027", "2028", "2029"]} sourceUrl={src.url} sourceTitle={src.title} highlightChanges={["2026", "2027"]} />
        <p className="text-sm text-ink-2">
          Ефектът на всяка мярка върху приходите (оценка на МФ) е в{" "}
          <Link href="/tablo#merki" className="underline underline-offset-2">
            изследователя на мерките
          </Link>
          .
        </p>
      </Section>

      <Section id="prihodi" title="Данъчни приходи по видове" lead="КФП, касова основа, млн. €. 2025 — отчет; 2026 — очаквано; 2027 — проект; 2028–2029 — прогноза.">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <YearBars title="ДДС" unitLabel="млн. €" series={[bars("ДДС", "series-1", S("kfp.revenue.vat"))]} />
          <YearBars title="Акцизи" unitLabel="млн. €" series={[bars("Акцизи", "series-1", S("kfp.revenue.excise"))]} />
          <YearBars title="Данъци върху доходите на физическите лица" unitLabel="млн. €" series={[bars("ДДФЛ", "series-1", S("kfp.revenue.pit"))]} />
          <YearBars title="Корпоративни данъци" unitLabel="млн. €" series={[bars("Корпоративни данъци", "series-1", S("kfp.revenue.cit"))]} />
        </div>
      </Section>

      <Section id="vsichki" title="Всички данъчни допускания 2026–2029">
        <TableView table={a} only={taxRows} columns={["2026", "2027", "2028", "2029"]} sourceUrl={src.url} sourceTitle={src.title} highlightChanges={["2026", "2027"]} searchable maxHeight="36rem" />
      </Section>
    </PageShell>
  );
}
