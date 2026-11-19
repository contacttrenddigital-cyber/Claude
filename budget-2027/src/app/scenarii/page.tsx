import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { ScenarioLab } from "@/components/scenario/ScenarioLab";
import { getPublished, seriesOf } from "@/lib/data/published";
import { LINES, type Baseline } from "@/lib/scenario/model";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Сценарии: какво ако",
  description: "Променете данъчни приходи и разходи в бюджета за 2027 г. и вижте аритметичния ефект върху дефицита и дълга. Без измислени мултипликатори.",
  alternates: { canonical: "/scenarii" },
};

export default async function Scenarios() {
  const data = await getPublished();
  const v = (k: string) => seriesOf(data, k).points.find((p) => p.period === "2027")!.value!;
  const baseline: Baseline = {
    revenue: v("kfp.revenue"),
    expenditure: v("kfp.expenditure"),
    balance: v("kfp.balance"),
    gdp: v("macro.gdp"),
    debt: v("debt.government"),
    lines: Object.fromEntries(LINES.map((l) => [l.key, v(l.metric)])) as Baseline["lines"],
  };
  return (
    <PageShell
      eyebrow="Сценарии"
      title="Какво ако…"
      lead={
        <p>
          Базата е проектът за 2027 г.: КФП (Приложение № 3), държавен дълг (Табл. VI-1), БВП. Местете плъзгачите и вижте как се променят
          дефицитът и дългът. Показваме само счетоводния ефект, без допускания за поведението на хората и фирмите.
        </p>
      }
    >
      <ScenarioLab baseline={baseline} />
    </PageShell>
  );
}
