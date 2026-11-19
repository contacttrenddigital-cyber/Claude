import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { computeFindings } from "@/lib/findings";
import { getPublished } from "@/lib/data/published";
import { findingsData } from "@/lib/data/view";
import { fmtNum } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Бюджетът под лупа",
  description: "Проверени находки в бюджета за 2027 г.: източник, число, методология, пресмятане, извод, ограничения и право на отговор.",
  alternates: { canonical: "/pod-lupa" },
};

const TONE: Record<string, string> = { risk: "Риск", positive: "Положително", "data-quality": "Качество на данните", neutral: "Промяна" };

export default async function UnderTheLens() {
  const data = await getPublished();
  const F = computeFindings(findingsData(data));
  return (
    <PageShell
      eyebrow="Под лупа"
      title="Бюджетът под лупа"
      lead={
        <p>
          Находки, изчислени автоматично от официалните таблици. Всяка следва една и съща схема: източник → число → методология →
          пресмятане → извод → ограничения → право на отговор. Това са въпроси, които заслужават внимание, а не обвинения.
        </p>
      }
    >
      <ol className="flex flex-col gap-10">
        {F.map((f) => (
          <li key={f.id} id={f.id} className="grid scroll-mt-32 grid-cols-1 gap-4 border-t border-rule-strong pt-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] [&>*]:min-w-0">
            <div className="flex flex-col gap-2">
              <p className="text-xs tracking-wide text-muted uppercase">{TONE[f.tone]}</p>
              <h2 className="text-xl font-semibold tracking-tight">{f.title}</h2>
              <ul className="mt-1 flex flex-col gap-1">
                {f.numbers.map((n) => (
                  <li key={n.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 text-sm">
                    <span className="text-ink-2">{n.label}</span>
                    <span className="num text-right font-semibold">
                      {n.value.includes("→") ? n.value.split(" → ").map((v) => fmtNum(v)).join(" → ") : fmtNum(n.value)} {n.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
              <dt className="text-xs font-semibold tracking-wide text-ink-2 uppercase">Източник</dt>
              <dd>{f.sources.join("; ")}</dd>
              <dt className="text-xs font-semibold tracking-wide text-ink-2 uppercase">Методология</dt>
              <dd>{f.method}</dd>
              <dt className="text-xs font-semibold tracking-wide text-ink-2 uppercase">Пресмятане</dt>
              <dd className="num">{f.calculation}</dd>
              <dt className="text-xs font-semibold tracking-wide text-ink-2 uppercase">Извод</dt>
              <dd className="text-ink">{f.conclusion}</dd>
              <dt className="text-xs font-semibold tracking-wide text-ink-2 uppercase">Ограничения</dt>
              <dd className="text-ink-2">{f.limitations}</dd>
              <dt className="text-xs font-semibold tracking-wide text-ink-2 uppercase">Право на отговор</dt>
              <dd className="text-ink-2">{f.response}</dd>
            </dl>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
