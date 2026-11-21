import type { Metadata } from "next";
import Decimal from "decimal.js";
import { PageShell, Section } from "@/components/site/PageShell";
import { MunicipalExplorer, type MuniView } from "@/components/municipal/MunicipalExplorer";
import { TableView } from "@/components/tables/TableView";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";
import { municipalitySlug } from "@/lib/municipal/slug";
import { fmtNum, fmtSigned, rescale } from "@/lib/format";
import { printed } from "@/lib/data/pick";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Общини: трансфери от държавата 2027",
  description: "Трансферите от централния бюджет към всяка от 265-те общини за 2027 г. по законопроекта, сравнени с 2026 г., на жител и на карта.",
  alternates: { canonical: "/obshtini" },
};

export default async function Municipalities() {
  const data = await getPublished();
  const src = billSource(data);
  const ms = data.municipalities;
  const items: MuniView[] = ms.map((m) => ({
    code: m.code,
    name: m.name,
    region: m.region,
    slug: municipalitySlug(m, ms),
    population: m.population,
    total2027: m.y2027.total ?? null,
    total2026: m.y2026.total ?? null,
    perCapita2027: m.perCapita2027,
    perCapita2026: m.perCapita2026,
  }));
  const sum = (k: "y2027" | "y2026") => ms.reduce((s, m) => s.plus(m[k].total ?? "0"), new Decimal(0));
  const t27 = sum("y2027");
  const t26 = sum("y2026");
  const sigmaDoc = data.documents.find((d) => d.id.startsWith("sigma-municipalities"));
  const mt = tableOf(data, "municipalTotals");
  const mln = (re: RegExp) => rescale(printed(mt, re, "2027"), "хил. €", "млн. €");
  return (
    <PageShell
      eyebrow="Общини"
      title="Колко получава всяка община"
      lead={
        <p>
          Основните бюджетни взаимоотношения с 265-те общини: субсидия за делегираните от държавата дейности, изравнителна субсидия, зимно поддържане и целева субсидия за капиталови разходи. Това е само
          трансферът от държавата, не целият бюджет на общината: собствените приходи и средствата от ЕС не са включени.
        </p>
      }
      facts={[
        { label: "Трансфери към общините, 2027", value: mln(/^Основни бюджетни взаимоотношения/), unit: "млн. €", tone: "sky", note: "Основните бюджетни взаимоотношения общо." },
        { label: "За делегираните от държавата дейности", value: mln(/^Обща субсидия за делегираните/), unit: "млн. €", tone: "mustard", note: "Субсидия от държавата за дейности като образование и социални услуги." },
        { label: "Целева субсидия за капиталови разходи", value: mln(/^Целева субсидия за капиталови/), unit: "млн. €", tone: "mint", note: "Същата сума е заложена и за 2028–2029 г." },
      ]}
      factsSource="Приложение № 9 към мотивите (бюджетни взаимоотношения с общините, 2027–2029 г.), в хил. €, показано в млн. €."
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <article className="flex flex-col gap-1 border-t border-rule-strong pt-3">
          <h2 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">Общо 2027 · проект</h2>
          <p className="num text-4xl font-semibold">
            {fmtNum(t27.dividedBy(1000).toFixed(1))} <span className="text-base font-normal text-muted">млн. €</span>
          </p>
          <p className="num text-sm text-ink-2">
            2026 (закон): {fmtNum(t26.dividedBy(1000).toFixed(1))} млн. € · {fmtSigned(t27.minus(t26).dividedBy(t26).times(100).toFixed(1))}%
          </p>
        </article>
        <article className="flex flex-col gap-1 border-t border-rule-strong pt-3 sm:col-span-2">
          <h2 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">Как да четем сравнението</h2>
          <p className="text-sm text-ink-2">
            2027 г. е по законопроекта (чл. 52), 2026 г. по приетия ЗДБ 2026 (чл. 51), по данни на СИГМА Бюджет. Структурата на
            трансферите е една и съща. Сумата на жител е изчислена с населението към 01.01.2024 г. (Евростат GISCO). Разликите на жител
            може да отразяват различни делегирани дейности и стандарти; сравнението само по себе си не показва несправедливост.
          </p>
        </article>
      </div>
      <Section id="karta" title="Карта и списък">
        <MunicipalExplorer items={items} geoUrl="/geo/obshtini.json" />
      </Section>
      <Section id="obshto" title="Общо за всички общини, 2027–2029" lead="Приложение № 9 към мотивите.">
        <TableView table={tableOf(data, "municipalTotals")} sourceUrl={src.url} sourceTitle={src.title} />
      </Section>
      <p className="text-xs text-muted">
        Източници: законопроект 52-602-01-71, чл. 52 (2027); {sigmaDoc?.title} (2026 и население). Свързани са 265 от 265 общини по
        официален код (автоматична проверка).
      </p>
    </PageShell>
  );
}
