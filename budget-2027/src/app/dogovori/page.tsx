import type { Metadata } from "next";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { YearBars } from "@/components/charts/YearBars";
import { RankedBars } from "@/components/charts/RankedBars";
import { getPublished, tableOf } from "@/lib/data/published";
import { dateBg } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Договори по обществени поръчки 2026",
  description: "Подписаните договори по обществени поръчки през 2026 г. по данни на Регистъра на обществените поръчки (ЦАИС ЕОП): по месец, възложител, дейност и вид процедура, и най-големите договори.",
  alternates: { canonical: "/dogovori" },
};

const MONTH_LONG = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];
const MONTH = ["яну", "фев", "мар", "апр", "май", "юни", "юли", "авг", "сеп", "окт", "ное", "дек"];

export default async function Contracts() {
  const data = await getPublished();
  const mon = tableOf(data, "procurementMonthly");
  const act = tableOf(data, "procurementByActivity");
  const proc = tableOf(data, "procurementByProcedure");
  const top = tableOf(data, "procurementTopBuyers");
  const big = tableOf(data, "procurementLargest");
  const docs = data.documents.filter((d) => d.id.startsWith("eop-contracts-"));
  const last = docs.at(-1)!;
  const scope = data.checks.find((c) => c.id === "procurement:scope");
  // totals from the unrounded contract values (snapshot check „procurement:scope“)
  const tot = scope?.details as { count?: string; value?: string; eu?: string } | undefined;
  const first = mon.rows[0]!.label;
  const lastM = mon.rows.at(-1)!.label;
  const src = `Регистър на обществените поръчки (ЦАИС ЕОП), отворени данни, ${MONTH[Number(first.slice(5)) - 1]}–${MONTH[Number(lastM.slice(5)) - 1]} 2026 г.`;
  return (
    <PageShell
      eyebrow="Договори"
      title="Договорите по обществени поръчки"
      lead={
        <>
          <p>
            Какво възлагат държавата, общините и публичните предприятия: подписаните договори по обществени поръчки през 2026 г. по данните, които
            Агенцията по обществени поръчки публикува всеки месец.
          </p>
          <p>
            Стойността на договор не е разход в бюджета: много договори са за няколко години, рамковите споразумения показват горна граница, а
            плащанията стават по-късно. Затова тези суми не се сравняват с бюджета ред по ред и не са свързани с бюджетните програми.
          </p>
        </>
      }
      facts={[
        { label: "Подписани договори", value: tot!.count!, unit: "", decimals: 0, tone: "sky", note: `Публикувани ${MONTH_LONG[Number(first.slice(5)) - 1]}–${MONTH_LONG[Number(lastM.slice(5)) - 1]} 2026 г.` },
        { label: "Стойност на договорите", value: tot!.value!, unit: "млн. €", tone: "mustard", note: "Сборът на договорените стойности (вкл. многогодишни)." },
        { label: "С европейско финансиране", value: tot!.eu!, unit: "млн. €", tone: "mint", note: "Договорите, отбелязани като финансирани от ЕС." },
      ]}
      factsSource={`${src} Лева са превърнати в евро по 1,95583. ${scope?.description.replace(/^ЦАИС ЕОП: /, "") ?? ""}.`}
    >
      <Section id="mesechno" title="По месец" lead="Стойността на договорите, публикувани през месеца, млн. €.">
        <YearBars
          title="Стойност на подписаните договори"
          unitLabel="млн. €"
          periodLabels={Object.fromEntries(mon.rows.map((r) => [r.label, MONTH[Number(r.label.slice(5)) - 1]!]))}
          series={[
            { name: "Всички договори", color: "series-1", points: mon.rows.map((r) => ({ period: r.label, value: r.cells.value?.value ?? null, vintage: "actual" as const, source: src })) },
            { name: "С европейско финансиране", color: "series-2", points: mon.rows.map((r) => ({ period: r.label, value: r.cells.eu?.value ?? null, vintage: "actual" as const, source: src })) },
          ]}
        />
      </Section>

      <Section id="vazlozhiteli" title="Кой възлага най-много" lead="50-те възложители с най-голяма обща стойност на договорите. Възложителят е разпознат по ЕИК/БУЛСТАТ; името е както е в регистъра.">
        <RankedBars
          title="Възложители, млн. €"
          subtitle={src}
          items={top.rows.slice(0, 15).map((r) => ({ label: r.label, value: r.cells.value?.value ?? null, base: null }))}
          unit="млн. €"
          valueLabel="2026"
          baseLabel="—"
        />
        <TableView table={top} sourceUrl={last.pageUrl ?? last.url} sourceTitle="ЦАИС ЕОП, отворени данни" collapsed />
      </Section>

      <Section id="deynosti" title="По дейност на възложителя">
        <RankedBars
          title="Основна дейност на възложителя, млн. €"
          subtitle={src}
          items={act.rows.slice(0, 12).map((r) => ({ label: r.label, value: r.cells.value?.value ?? null, base: null }))}
          unit="млн. €"
          valueLabel="2026"
          baseLabel="—"
        />
        <TableView table={proc} sourceUrl={last.pageUrl ?? last.url} sourceTitle="ЦАИС ЕОП, отворени данни" collapsed />
      </Section>

      <Section id="naj-golemi" title="Най-големите договори" lead="300-те договора с най-голяма стойност. Търси по възложител, изпълнител или предмет.">
        <TableView table={big} sourceUrl={last.pageUrl ?? last.url} sourceTitle="ЦАИС ЕОП, отворени данни" searchable maxHeight="40rem" />
        <p className="max-w-3xl text-sm text-ink-2">
          Данните са както са публикувани от възложителите в регистъра. Не правим изводи за нарушения. Файловете са изтеглени на{" "}
          {dateBg(last.retrievedOn)} от{" "}
          <a href="https://app.eop.bg/today/reporting/open-data" rel="noreferrer" className="underline underline-offset-2">
            отворените данни на ЦАИС ЕОП
          </a>
          .
        </p>
      </Section>
    </PageShell>
  );
}
