import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { CardStudio } from "@/components/workspace/CardStudio";
import { getPublished } from "@/lib/data/published";
import { metricCards } from "@/lib/data/view";
import { dateBg } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Студио за визуализации",
  description: "Създайте карта за социалните мрежи с проверено число от бюджета за 2027 г. — PNG и SVG в четири размера, с източник и дата.",
  alternates: { canonical: "/vizualizatsii" },
};

export default async function Visuals() {
  const data = await getPublished();
  return (
    <PageShell eyebrow="Визуализации" title="Студио за карти" lead={<p>Изберете показател и размер. Картата винаги носи източника, правния статус и датата на данните.</p>}>
      <CardStudio metrics={metricCards(data)} snapshotDate={dateBg(data.snapshot.retrievedOn)} snapshotId={data.snapshot.id} />
    </PageShell>
  );
}
