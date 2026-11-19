import type { Metadata } from "next";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Изпълнение на бюджета",
  description: "Програма срещу отчет за КФП: 2025 г. и към 30.09.2026 г., с разделяне на национален бюджет и средства от ЕС.",
  alternates: { canonical: "/izpalnenie" },
};

export default async function Execution() {
  const data = await getPublished();
  const src = billSource(data);
  return (
    <PageShell
      eyebrow="Изпълнение"
      title="Обещано → изпълнено"
      lead={
        <p>
          Сравнение на програмата с отчета по КФП, по данните в Приложение № 1 към мотивите. Изпълнение към 30.09 е частично за годината;
          процентът показва хода на плана, не прогноза. Договори и плащания по отделни проекти още не са свързани с бюджетните редове.
        </p>
      }
    >
      <Section id="2026" title="2026 г.: програма и отчет към 30.09.2026">
        <TableView table={tableOf(data, "execution2026")} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>
      <Section id="2025" title="2025 г.: програма и годишен отчет">
        <TableView table={tableOf(data, "execution2025")} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>
    </PageShell>
  );
}
