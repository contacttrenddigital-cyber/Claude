import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { MyDashboard } from "@/components/workspace/MyDashboard";
import { getPublished } from "@/lib/data/published";
import { metricCards } from "@/lib/data/view";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Моето табло",
  description: "Изберете показателите от бюджета за 2027 г., които следите, и споделете таблото с връзка. Без регистрация.",
  alternates: { canonical: "/moeto-tablo" },
};

export default async function Dashboard() {
  const data = await getPublished();
  return (
    <PageShell eyebrow="Моето табло" title="Моето табло" lead={<p>Изберете до 12 показателя. Всички стойности са от внесения законопроект, с източник под всяка карта.</p>}>
      <MyDashboard metrics={metricCards(data)} />
    </PageShell>
  );
}
