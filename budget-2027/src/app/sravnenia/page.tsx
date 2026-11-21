import type { Metadata } from "next";
import Link from "next/link";
import { RankedBars } from "@/components/charts/RankedBars";
import { StatTile } from "@/components/fiscal/LawFigures";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { documentOf, getPublished, tableOf } from "@/lib/data/published";
import { rankOf } from "@/lib/eurostat/rank";
import { cofogGap } from "@/lib/eurostat/cofog";
import { YearBars } from "@/components/charts/YearBars";
import { dateBg, fmtNum, fmtSigned } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "България в ЕС: дефицит, дълг и разходи по функции",
  description: "Дефицитът, дългът и разходите по функции (COFOG) на сектор „Държавно управление“ в държавите от ЕС по данни на Евростат, с мястото на България и историята от 2015 г.",
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
  const cof = tableOf(data, "euCofog");
  const cofDoc = documentOf(data, cof.documentId)!;
  const hist = tableOf(data, "cofogHistoryBG");
  const gap = cofogGap(cof);
  const cofSrc = `Евростат, gov_10a_exp (COFOG), ${cofDoc.publishedOn ? `обновено ${dateBg(cofDoc.publishedOn)}` : ""}`;
  const cofItems = (k: string) => cof.rows.filter((r) => r.kind === "data").map((r) => ({ label: r.label, value: r.cells[k]?.value ?? null, base: null, highlight: r.texts?.geo === "BG" }));
  const histTotal = hist.rows.find((r) => r.kind === "total")!;
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
      summary={
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <StatTile tone="sky"
            label="Дълг на България"
            value={debt?.value ?? null}
            unit="% от БВП"
            show="% от БВП"
            tag="2025 · отчет"
            source={src}
            note={debt ? `${debt.rank}-и най-нисък от ${debt.of} държави в ЕС. ЕС-27: ${eu.cells["GD:2025"]!.text}%.` : undefined}
          />
          <StatTile tone="mustard"
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
      }
    >

      <p className="max-w-3xl text-sm text-ink-2">
        Референтните стойности в ЕС са 3% от БВП за дефицита и 60% от БВП за дълга (Протокол № 12 към Договора за функционирането на ЕС).
      </p>

      <Section id="klasatsii" title="2025 г. по държави" lead="България е открита с друг цвят и удебелен надпис.">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <RankedBars title="Дълг, % от БВП, 2025" subtitle={src} items={items("GD:2025")} unit="% от БВП" valueLabel="2025 (отчет)" baseLabel="—" />
          <RankedBars title="Салдо, % от БВП, 2025" subtitle={`${src} Отрицателно = дефицит.`} items={items("B9:2025")} unit="% от БВП" valueLabel="2025 (отчет)" baseLabel="—" />
        </div>
      </Section>

      <Section
        id="sektori"
        title="За какво харчи държавата: България и ЕС, 2024"
        lead={`Разходи на сектор „Държавно управление“ по функции (COFOG), % от БВП. ${cofSrc} Това е друг разрез от функциите в законопроекта (КФП): двата не се сравняват ред по ред.`}
      >
        <div className="overflow-x-auto rounded-3xl border border-rule bg-surface" tabIndex={0} role="region" aria-label="България и ЕС-27 по функции, 2024">
          <table className="num w-full min-w-[34rem] text-sm">
            <caption className="sr-only">България и ЕС-27: разходи по функции, % от БВП, 2024</caption>
            <thead>
              <tr className="border-b border-rule-strong text-[13px] text-ink-2">
                <th scope="col" className="px-4 py-2 text-left font-normal">Функция</th>
                <th scope="col" className="px-4 py-2 text-right font-normal">България</th>
                <th scope="col" className="px-4 py-2 text-right font-normal">ЕС-27</th>
                <th scope="col" className="px-4 py-2 text-right font-normal">Разлика, пр.п.</th>
              </tr>
            </thead>
            <tbody>
              {gap.map((g) => (
                <tr key={g.code} className={`border-b border-rule ${g.code === "TOTAL" ? "font-semibold" : ""}`}>
                  <th scope="row" className="px-4 py-2 text-left font-normal">{g.label}</th>
                  <td className="px-4 py-2 text-right">{g.bg === null ? "—" : `${fmtNum(g.bg, 1)}%`}</td>
                  <td className="px-4 py-2 text-right">{g.eu === null ? "—" : `${fmtNum(g.eu, 1)}%`}</td>
                  <td className="px-4 py-2 text-right">{g.gap === null ? "—" : fmtSigned(g.gap, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="max-w-3xl text-sm text-ink-2">
          Разликата е България минус средното за ЕС-27 в процентни пунктове от БВП, изчислена от отпечатаните стойности. По-малък дял от БВП не
          значи непременно по-малко пари на човек: БВП на човек се различава между държавите.
        </p>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <RankedBars title="Общо разходи, % от БВП, 2024" subtitle={cofSrc} items={cofItems("TOTAL")} unit="% от БВП" valueLabel="2024 (отчет)" baseLabel="—" />
          <RankedBars title="Социална защита, % от БВП, 2024" subtitle={cofSrc} items={cofItems("GF10")} unit="% от БВП" valueLabel="2024 (отчет)" baseLabel="—" />
        </div>
      </Section>

      <Section id="istoria" title="България от 2015 до 2024 г." lead={`Разходи по функции, % от БВП, отчет. ${cofSrc}`}>
        <YearBars
          title="Общо разходи на сектор „Държавно управление“"
          unitLabel="% от БВП"
          series={[{ name: "България", color: "series-1", points: hist.columns.map((c) => ({ period: c.key, value: histTotal.cells[c.key]?.value ?? null, vintage: "actual" as const, source: cofSrc })) }]}
        />
        <TableView table={hist} sourceUrl={cofDoc.pageUrl ?? cofDoc.url} sourceTitle={cofDoc.title} collapsed />
      </Section>

      <Section id="tablitsa" title="Дефицит и дълг: всички стойности, 2023–2025">
        <TableView table={t} sourceUrl={doc.pageUrl ?? doc.url} sourceTitle={doc.title} searchable />
      </Section>
    </PageShell>
  );
}
