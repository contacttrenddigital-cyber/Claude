import type { Metadata } from "next";
import { Calculator } from "@/components/calc/Calculator";
import { SiteHeader } from "@/components/site/SiteHeader";
import { NoPublishedSnapshotError, getPublished } from "@/lib/data/published";
import { dateBg } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Колко ще ми струва Бюджет 2027?",
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
      <main id="main" className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pt-10 pb-20 sm:px-6">
        <header className="flex max-w-3xl flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-accent uppercase">Калкулатор · трудов договор</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Колко ще ми струва Бюджет 2027?</h1>
          <p className="text-ink-2">
            Сравнява нетната заплата, данъка, осигуровките и разхода на работодателя по правилата в сила през 2026 г. с предложенията в
            законопроектите за 2027 г. Ставките на данъка и осигуровките не се променят. Променят се максималният осигурителен доход
            (2 400 €) и облекченията за деца.
          </p>
        </header>
        <Calculator docUrls={docUrls} />
      </main>
    </>
  );
}
