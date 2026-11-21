import type { Metadata } from "next";
import { PageShell, Section } from "@/components/site/PageShell";
import { ProjectsExplorer } from "@/components/tables/ProjectsExplorer";
import { YearBars } from "@/components/charts/YearBars";
import { KpiTile } from "@/components/fiscal/KpiTile";
import { getPublished, seriesOf, tableOf } from "@/lib/data/published";
import { bars, billSource } from "@/lib/data/view";
import { fmtNum } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Инвестиции 2027",
  description: "Капиталовите разходи по КФП 2025–2029, изпълнението им през 2026 г. и 225-те приоритетни инвестиционни проекта с национално финансиране.",
  alternates: { canonical: "/investitsii" },
};

export default async function Investment() {
  const data = await getPublished();
  const S = (k: string) => seriesOf(data, k);
  const ex = tableOf(data, "execution2026").rows.find((r) => r.label.startsWith("Капиталови"));
  const diff = data.versionDiffs.find((d) => d.label === "Капиталови разходи");
  const src = billSource(data);
  return (
    <PageShell
      eyebrow="Инвестиции"
      title="Публичните инвестиции"
      lead={
        <p>
          Капиталовите разходи по КФП падат от 9 360,6 млн. € (очаквано 2026) на 6 005,0 млн. € (проект 2027), според мотивите основно заради края
          на проектите по Плана за възстановяване и устойчивост. Разчет в бюджета не означава извършена инвестиция.
        </p>
      }
      summary={
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiTile tone="sky" size="lg" series={S("kfp.expenditure.capital")} ratio={S("kfp.expenditure.capital.pctGdp")} />
          {ex && (
            <article className="on-card bg-card-mustard flex flex-col gap-2 rounded-3xl p-5 shadow-lg shadow-black/30">
              <h3 className="text-[14px] font-semibold text-ink-2">Изпълнение 2026 към 30.09</h3>
              <p className="num font-display text-[2.4rem] leading-none font-semibold">{fmtNum(ex.cells.pct!.value)}%</p>
              <p className="num text-sm text-ink-2">
                {fmtNum(ex.cells.actual!.value)} от {fmtNum(ex.cells.plan!.value)} млн. € по програмата за 2026 г. (капиталови разходи по КФП)
              </p>
              <p className="text-xs text-muted">Приложение № 1 към мотивите.</p>
            </article>
          )}
          {diff && (
            <article className="on-card bg-card-mint flex flex-col gap-2 rounded-3xl p-5 shadow-lg shadow-black/30">
              <h3 className="text-[14px] font-semibold text-ink-2">Промяна 06.11 → 16.11</h3>
              <p className="num font-display text-[2.4rem] leading-none font-semibold">
                {fmtNum(diff.difference)}
                <span className="ml-1.5 font-sans text-base font-normal">млн. €</span>
              </p>
              <p className="num text-sm text-ink-2">
                {fmtNum(diff.before)} млн. € в проекта от 06.11 → {fmtNum(diff.after)} млн. € във внесения текст
              </p>
              <p className="text-xs text-muted">Двете версии на законопроекта; разликата е изчислена от отпечатаните стойности.</p>
            </article>
          )}
        </div>
      }
    >
      <Section id="dinamika" title="Капиталови разходи 2025–2029">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <YearBars title="Капиталови разходи" subtitle="КФП, касова основа" unitLabel="млн. €" series={[bars("Капиталови разходи", "neutral", S("kfp.expenditure.capital"))]} />
          <YearBars title="Капиталови разходи, % от БВП" unitLabel="% от БВП" series={[bars("Капиталови разходи", "neutral", S("kfp.expenditure.capital.pctGdp"))]} />
        </div>
      </Section>
      <Section id="proekti" title="Приоритетни инвестиционни проекти" lead="Програма за приоритетни стратегически инвестиционни проекти с национално финансиране 2027–2029 (приложение към чл. 107, ал. 1). Подредени по капиталови разходи за 2027 г.">
        <ProjectsExplorer table={tableOf(data, "projects")} sourceUrl={src.url} />
      </Section>
    </PageShell>
  );
}
