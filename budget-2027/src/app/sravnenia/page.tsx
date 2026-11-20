import type { Metadata } from "next";
import Link from "next/link";
import { RankedBars } from "@/components/charts/RankedBars";
import { StatTile } from "@/components/fiscal/LawFigures";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { documentOf, getPublished, tableOf } from "@/lib/data/published";
import { rankOf } from "@/lib/eurostat/rank";
import { dateBg } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "България в ЕС: дефицит и дълг",
  description: "Дефицитът и дългът на сектор „Държавно управление“ в държавите от ЕС за 2023–2025 г. по данни на Евростат (EDP нотификация), с мястото на България.",
  alternates: { canonical: "/sravnenia" },
};

export default async function Compare() {
  const data = await getPublished();
  const t = tableOf(data, "euFiscal");
  const doc = documentOf(data, t.documentId)!;
  const debt = rankOf(t, "GD:2025", "BG", "asc");
  const bal = rankOf(t, "B9:2025", "BG", "desc");
  const eu = t.rows.find((r) => r.kind === "total")!;
  const members = t.rows.filter((r) => r.kind === "data");
  const items = (k: string) => members.map((r) => ({ label: r.label, value: r.cells[k]?.value ?? null, base: null, highlight: r.texts?.geo === "BG" }));
  const src = `Евростат, gov_10dd_edpt1, ${doc.publishedOn ? `обновено ${dateBg(doc.publishedOn)}` : ""}`;
  return (
    <PageShell
      eyebrow="Сравнения"
      title="България сред държавите от ЕС"
      lead={
        <>
          <p>
            Сравняваме само сравнимо: отчетни данни на Евростат за сектор „Държавно управление“ по ЕСС 2010, еднакво изчислени за всички
            държави, за една и съща година. Последната година с отчет е 2025 г.
          </p>
          <p>
            Числата по бюджета за 2027 г. са проект и прогноза и не се поставят в една класация с отчетите на другите държави. Дефицитът за
            2027 г. по ЕСС е на{" "}
            <Link href="/defitsit" className="underline underline-offset-2">
              страницата за дефицита
            </Link>
            .
          </p>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 [&>*]:min-w-0">
        <StatTile
          label="Дълг на България"
          value={debt?.value ?? null}
          unit="% от БВП"
          show="% от БВП"
          tag="2025 · отчет"
          source={src}
          note={debt ? `${debt.rank}-и най-нисък от ${debt.of} държави в ЕС. ЕС-27: ${eu.cells["GD:2025"]!.text}%.` : undefined}
        />
        <StatTile
          label="Салдо на България"
          value={bal?.value ?? null}
          unit="% от БВП"
          show="% от БВП"
          signed
          tag="2025 · отчет"
          source={src}
          note={bal ? `${bal.rank}-о място от ${bal.of} (от най-голям излишък към най-голям дефицит). ЕС-27: ${eu.cells["B9:2025"]!.text}%.` : undefined}
        />
      </div>

      <p className="max-w-3xl text-sm text-ink-2">
        Референтните стойности в ЕС са 3% от БВП за дефицита и 60% от БВП за дълга (Протокол № 12 към Договора за функционирането на ЕС).
      </p>

      <Section id="klasatsii" title="2025 г. по държави" lead="България е открита с друг цвят и удебелен надпис.">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <RankedBars title="Дълг, % от БВП, 2025" subtitle={src} items={items("GD:2025")} unit="% от БВП" valueLabel="2025 (отчет)" baseLabel="—" />
          <RankedBars title="Салдо, % от БВП, 2025" subtitle={`${src} Отрицателно = дефицит.`} items={items("B9:2025")} unit="% от БВП" valueLabel="2025 (отчет)" baseLabel="—" />
        </div>
      </Section>

      <Section id="tablitsa" title="Всички стойности, 2023–2025">
        <TableView table={t} sourceUrl={doc.pageUrl ?? doc.url} sourceTitle={doc.title} searchable />
      </Section>
    </PageShell>
  );
}
