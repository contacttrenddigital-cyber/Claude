import type { Metadata } from "next";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { RankedBars } from "@/components/charts/RankedBars";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";
import { slugify } from "@/lib/slug";
import { rescale } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Институции: тавани на разходите 2027–2029",
  description: "Таваните на разходите на министерствата и другите първостепенни разпоредители с бюджет за 2027–2029 г. по Приложение № 4.",
  alternates: { canonical: "/institutsii" },
};

export default async function Institutions() {
  const data = await getPublished();
  const t = tableOf(data, "ceilings");
  const src = billSource(data);
  const links = Object.fromEntries(t.rows.filter((r) => r.level === 0).map((r) => [r.label, `/institutsii/${slugify(r.label)}`]));
  const items = t.rows
    .filter((r) => r.level === 0 && !/осигурителен институт|здравноосигурителна/.test(r.label))
    .map((r) => ({ label: r.label, value: r.cells["2027"]?.value ?? null, base: null, href: links[r.label] }))
    .filter((i) => i.value !== null)
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, 15);
  const top = items[0]!;
  return (
    <PageShell
      eyebrow="Институции"
      title="Колко може да харчи всяка институция"
      lead={
        <p>
          Тавани на разходите по Приложение № 4 към мотивите (хил. €). Таванът е горна граница на разходите по бюджета на институцията,
          не е отчет. Сумите не се събират: те включват трансфери между бюджетите (например НОИ и НЗОК получават трансфери от държавния
          бюджет).
        </p>
      }
      facts={[
        { label: "Институции с таван", value: String(t.rows.filter((r) => r.level === 0).length), unit: "", decimals: 0, tone: "sky", note: "Бюджетни организации с отделен ред в Приложение № 4." },
        { label: `Най-голям таван: ${top.label}`, value: rescale(top.value!, "хил. €", "млн. €"), unit: "млн. €", tone: "mustard", note: "Без НОИ и НЗОК, които имат отделни закони." },
      ]}
      factsSource="Приложение № 4 към мотивите (тавани на разходите по бюджетни организации, 2027 г.), в хил. €, показано в млн. €."
    >
      <Section id="nay-golemi" title="Най-големите тавани за 2027 г." lead="Без НОИ и НЗОК, които са отделни социалноосигурителни бюджети.">
        <RankedBars title="15 най-големи тавана" subtitle="Приложение № 4, хил. €, 2027 (проект)" items={items} unit="хил. €" valueLabel="2027 (проект)" baseLabel="—" />
      </Section>
      <Section id="vsichki" title="Всички институции">
        <TableView table={t} sourceUrl={src.url} sourceTitle={src.title} searchable links={links} />
      </Section>
    </PageShell>
  );
}
