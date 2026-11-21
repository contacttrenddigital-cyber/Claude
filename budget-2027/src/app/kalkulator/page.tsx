import type { Metadata } from "next";
import { Calculator } from "@/components/calc/Calculator";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { NoPublishedSnapshotError, getPublished } from "@/lib/data/published";
import { dateBg } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Калкулатор: колко ще получаваш през 2027 г.",
  description:
    "Калкулатор за нетна заплата, осигуровки и разход на работодателя по трудов договор: 2026 г. срещу предложенията за 2027 г., с източник за всяко правило. Изчислява се в браузъра.",
  alternates: { canonical: "/kalkulator" },
};

export default async function CalculatorPage() {
  let status = "законопроект — не е приет";
  let docUrls: Record<string, { url: string; title: string }> = {};
  try {
    const data = await getPublished();
    const bill = data.versions.find((v) => v.id === "bill-2026-11-16")!;
    status = `${bill.legalStatus} · внесен ${dateBg(bill.date)}`;
    docUrls = Object.fromEntries(data.documents.map((d) => [d.id, { url: d.pageUrl ?? d.url, title: d.title }]));
  } catch (e) {
    if (!(e instanceof NoPublishedSnapshotError)) throw e;
  }
  return (
    <>
      <SiteHeader status={status} />
      <main id="main">
        <header className="on-dark bg-hero">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-9 pb-10 sm:px-6 sm:pt-14 sm:pb-12">
          <p className="inline-flex w-fit items-center rounded-full bg-card-mustard px-3 py-1 text-[13px] font-semibold text-on-card">Калкулатор · трудов договор</p>
          <h1 className="font-display text-[2.6rem] leading-[0.95] font-semibold tracking-tight text-balance uppercase sm:text-[3.8rem]">Колко ще получаваш през 2027 г.?</h1>
          <p className="max-w-3xl text-[17px] leading-relaxed text-ink-2">
            Въведи брутната си заплата и виж нетната сума, данъка и осигуровките по сегашните правила и по предложението за 2027 г.
          </p>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-28 sm:px-6 sm:pt-10 lg:pb-20">
          <Calculator docUrls={docUrls} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
