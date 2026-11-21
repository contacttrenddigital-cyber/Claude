import type { Metadata } from "next";
import Link from "next/link";
import { QuoteBlock } from "@/components/fiscal/LawFigures";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";
import { QUOTES } from "@/lib/social/quotes";
import { printed } from "@/lib/data/pick";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Рискове пред бюджета 2027",
  description:
    "Рисковете пред прогнозата според мотивите, алтернативният сценарий с по-скъпи енергийни суровини и индикаторите за фискална устойчивост S1 и S2 по оценка на МФ и на ЕК.",
  alternates: { canonical: "/riskove" },
};

export default async function Risks() {
  const data = await getPublished();
  const src = billSource(data);
  const sus = tableOf(data, "sustainability");
  const alt = tableOf(data, "altScenario");
  return (
    <PageShell
      eyebrow="Рискове"
      title="Рисковете пред бюджета"
      lead={
        <p>
          Тази страница показва рисковете така, както ги описва Министерството на финансите в мотивите: рискове пред прогнозата, един
          алтернативен сценарий и дългосрочната устойчивост. Нашите находки с източници и изчисления са в{" "}
          <Link href="/pod-lupa" className="underline underline-offset-2">
            Под лупа
          </Link>
          , а промените в прогнозите са в{" "}
          <Link href="/prognozi" className="underline underline-offset-2">
            Прогнози и ревизии
          </Link>
          .
        </p>
      }
      facts={[
        { label: "Индикатор S2 по оценка на МФ", value: printed(sus, /^Стойност/, "mfS2"), unit: "% от БВП", tone: "rose", note: "Дългосрочен риск за устойчивостта на публичните финанси." },
        { label: "Индикатор S2 по оценка на ЕК", value: printed(sus, /^Стойност/, "ecS2"), unit: "% от БВП", tone: "lilac", note: "Комисията оценява същия риск по-ниско." },
        { label: "Инфлация при по-скъпи петрол и газ", value: printed(alt, /^Средногодишна инфлация/, "2027"), unit: "пр.п.", tone: "mustard", note: "Отклонение спрямо базовия сценарий, 2027 г. Симулация на МФ, не прогноза." },
      ]}
      factsSource="мотиви към законопроекта, Табл. VII-1 (индикатори за устойчивост) и Табл. VII-3 (алтернативен сценарий)."
    >
      <Section id="prognoza" title="Рискове пред прогнозата" lead="Мотиви, раздел „Рискове пред прогнозата“. Дословни откъси.">
        <div className="flex max-w-3xl flex-col gap-5">
          <QuoteBlock quote={QUOTES.riskMiddleEast} url={src.url} />
          <QuoteBlock quote={QUOTES.riskInflation} url={src.url} />
          <QuoteBlock quote={QUOTES.riskDemand} url={src.url} />
          <QuoteBlock quote={QUOTES.riskUpside} url={src.url} />
        </div>
      </Section>

      <Section
        id="stsenariy"
        title="Алтернативен сценарий: по-скъпи петрол и газ"
        lead="Табл. VII-2 и VII-3. Стойностите са отклонения спрямо базовия сценарий: в процентни пунктове (пр.п.) или в %, както е отпечатано. Това е симулация на МФ, не прогноза."
      >
        <TableView table={tableOf(data, "altAssumptions")} sourceUrl={src.url} sourceTitle={src.title} />
        <TableView table={tableOf(data, "altScenario")} sourceUrl={src.url} sourceTitle={src.title} />
        <div className="flex max-w-3xl flex-col gap-5">
          <QuoteBlock quote={QUOTES.altInflation} url={src.url} />
          <QuoteBlock quote={QUOTES.altGrowth} url={src.url} />
          <QuoteBlock quote={QUOTES.altDebt} url={src.url} />
        </div>
      </Section>

      <Section id="ustoychivost" title="Дългосрочна устойчивост: S1 и S2" lead="Табл. VII-1: индикатори в % от БВП по оценка на МФ и на ЕК. Двете институции оценяват риска различно.">
        <div className="flex max-w-3xl flex-col gap-5">
          <QuoteBlock quote={QUOTES.s1} url={src.url} />
          <QuoteBlock quote={QUOTES.s2} url={src.url} />
        </div>
        <TableView table={tableOf(data, "sustainability")} sourceUrl={src.url} sourceTitle={src.title} />
        <div className="flex max-w-3xl flex-col gap-5">
          <QuoteBlock quote={QUOTES.sustainabilityMf} url={src.url} />
          <QuoteBlock quote={QUOTES.sustainabilityEc} url={src.url} />
        </div>
      </Section>
    </PageShell>
  );
}
