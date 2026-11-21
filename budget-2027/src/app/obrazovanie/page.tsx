import type { Metadata } from "next";
import { YearBars } from "@/components/charts/YearBars";
import { QuoteBlock, StatTile } from "@/components/fiscal/LawFigures";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource, rowBars } from "@/lib/data/view";
import { sectorRows } from "@/lib/analysis/sectors";
import { fmtNum, fmtSigned } from "@/lib/format";
import { QUOTES } from "@/lib/social/quotes";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Образование 2027",
  description: "Разходите за образование по КФП за 2026–2029 г., таванът на Министерството на образованието и науката и изброените в мотивите средства за 2027 г.",
  alternates: { canonical: "/obrazovanie" },
};

export default async function Education() {
  const data = await getPublished();
  const f = tableOf(data, "functions");
  const ceilings = tableOf(data, "ceilings");
  const alloc = tableOf(data, "educationAllocations");
  const src = billSource(data);
  const edu = sectorRows(f).rows.find((r) => r.label === "Образование")!;
  const eduRow = f.rows.find((r) => r.label === "Образование")!;
  const mon = ceilings.rows.find((r) => r.label === "Министерство на образованието и науката")!;
  const teachers = alloc.rows.find((r) => r.rowIndex === 614)!;
  return (
    <PageShell
      eyebrow="Образование"
      title="Образованието в бюджета"
      lead={
        <p>
          Три различни числа, с различен обхват: разходите за функция „Образование“ по консолидираната фискална програма (всички нива на
          управление), таванът на разходите на Министерството на образованието и науката и отделните суми, изброени в мотивите. Не ги
          събирай и не ги сравнявай пряко.
        </p>
      }
      summary={
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3 [&>*]:min-w-0">
          <StatTile tone="sky"
            label="Функция „Образование“"
            value={edu.value}
            unit="млн. €"
            source="Табл. III-1, КФП"
            note={`${fmtNum(eduRow.cells["2027%"]!.value, 1)}% от БВП. Спрямо очакваното за 2026 г.: ${fmtSigned(edu.delta, 1)} млн. € (${fmtSigned(edu.change, 1)}%).`}
          />
          <StatTile tone="mustard" label="Таван на МОН" value={mon.cells["2027"]!.value} unit="хил. €" source="Приложение № 4 към мотивите" note="Разходите на министерството, не на цялата система." />
          <StatTile tone="mint"
            label="Заплати на педагозите"
            value={teachers.cells["2027"]!.value}
            unit="млн. €"
            tag="2027 · допълнително"
            source={`мотиви, абзац ${teachers.rowIndex}`}
            note="Допълнителни средства за увеличение на заплатите със 7,5%."
          />
        </div>
      }
    >

      <Section id="dinamika" title="2026–2029">
        <div className="max-w-2xl">
          <YearBars
            title="Функция „Образование“"
            subtitle="КФП, млн. €"
            unitLabel="млн. €"
            series={[rowBars("Образование", "series-1", f, "Образование", "Табл. III-1", ["2026", "2027", "2028", "2029"])]}
          />
        </div>
      </Section>

      <Section id="sredstva" title="Изброените средства за 2027 г." lead="Мотиви, „Политика в областта на образованието и науката“. Документът не дава сбор и ние не го изчисляваме: част от сумите са описани като „допълнителни“, а част не, затова сборът им не е мярка за ръст.">
        <TableView table={alloc} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>

      <Section id="motivi" title="Какво казват мотивите">
        <div className="flex max-w-3xl flex-col gap-5">
          <QuoteBlock quote={QUOTES.teachersPay} url={src.url} />
          <QuoteBlock quote={QUOTES.payRise} url={src.url} />
        </div>
      </Section>
    </PageShell>
  );
}
