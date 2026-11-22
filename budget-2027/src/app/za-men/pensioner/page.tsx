import type { Metadata } from "next";
import { RolePage } from "@/components/roles/RolePage";
import { pct } from "@/components/fiscal/LawFigures";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource, lawSource } from "@/lib/data/view";
import { rescale } from "@/lib/format";
import { amount, dooPensionsShare } from "@/lib/social/derived";
import { QUOTES } from "@/lib/social/quotes";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Пенсионер: какво променя Бюджет 2027",
  description: "Пенсиите през 2027 г.: колко пари са предвидени, кога и как се осъвременяват, какво се променя в условията за пенсиониране.",
  alternates: { canonical: "/za-men/pensioner" },
};

export default async function Pensioner() {
  const data = await getPublished();
  const exp = tableOf(data, "dooExpenditure");
  const doo = lawSource(data, "ns-52-602-01-68-rtf");
  const bill = billSource(data);
  const ps = dooPensionsShare(exp);
  const q = (k: keyof typeof QUOTES) => `„${QUOTES[k].text}“`;
  return (
    <RolePage
      eyebrow="За мен · пенсионер"
      title="Пенсионер съм"
      lead={<p>Пенсиите се плащат от бюджета на държавното обществено осигуряване (ДОО). Ето какво предвиждат законопроектите за 2027 г.</p>}
      facts={[
        { label: "Разходи за пенсии, 2027", value: rescale(amount(exp, "1.1."), "хил. €", "млн. €"), unit: "млн. €", tone: "sky", note: `${pct(ps.value)} от всички разходи на ДОО.` },
        { label: "Бюджет на ДОО", value: rescale(amount(tableOf(data, "dooRevenue"), "total"), "хил. €", "млн. €"), unit: "млн. €", tone: "mustard", note: "Приходите и разходите са равни." },
      ]}
      factsSource="законопроект за бюджета на ДОО 2027 (НС, № 52-602-01-68), чл. 1. Делът е изчислен от отпечатаните стойности."
      changes={[
        { title: "Колко пари за пенсии", text: q("pensionGrowth"), source: QUOTES.pensionGrowth.where, sourceUrl: bill.url },
        { title: "Осъвременяване", text: q("pensionIndexation"), source: QUOTES.pensionIndexation.where, sourceUrl: bill.url },
        { title: "Условия за пенсиониране", text: q("pensionConditions"), source: QUOTES.pensionConditions.where, sourceUrl: bill.url },
        { title: "Следващите години", text: q("pensionGrowthLater"), source: QUOTES.pensionGrowthLater.where, sourceUrl: bill.url },
      ]}
      tools={[
        { href: "/pensii", title: "Пенсии и ДОО", text: "Целият бюджет на ДОО, фондовете и откъде идват парите.", icon: "users" },
        { href: "/zdraveopazvane", title: "Здравеопазване", text: "Бюджетът на здравната каса: болници, лекарства.", icon: "cross" },
        { href: "/osigurovki#sotsialni", title: "Социални плащания", text: "Минималната пенсия и другите размери за 2026–2029 г.", icon: "coins" },
      ]}
    >
      <p className="max-w-3xl text-sm text-ink-2">
        Пълният текст е в{" "}
        <a href={doo.url} rel="noreferrer" className="underline underline-offset-2">
          законопроекта за бюджета на ДОО
        </a>{" "}
        и в мотивите към законопроекта за държавния бюджет (раздел „Пенсионна политика“).
      </p>
    </RolePage>
  );
}
