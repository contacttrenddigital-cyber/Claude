import type { Metadata } from "next";
import { RolePage } from "@/components/roles/RolePage";
import { getPublished, tableOf } from "@/lib/data/published";
import { printed } from "@/lib/data/pick";
import { billSource } from "@/lib/data/view";
import { QUOTES } from "@/lib/social/quotes";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Фирма: какво променя Бюджет 2027",
  description: "Корпоративен данък, данък върху дивидентите, нови данъци и акцизи, осигуровки и разход за служител през 2027 г.",
  alternates: { canonical: "/za-men/firma" },
};

export default async function Firm() {
  const data = await getPublished();
  const a = tableOf(data, "assumptions");
  const bill = billSource(data);
  const inKind26 = printed(a, /Данък върху разходите в натура/, "2026");
  const inKind27 = printed(a, /Данък върху разходите в натура/, "2027");
  const q = (k: keyof typeof QUOTES) => `„${QUOTES[k].text}“`;
  return (
    <RolePage
      eyebrow="За мен · фирма"
      title="Имам фирма"
      lead={<p>Какво предлага бюджетът за 2027 г. на бизнеса: данъци, нови такси и акцизи, и колко струва един служител на работодателя.</p>}
      facts={[
        { label: "Корпоративен данък", value: printed(a, /^Размер на основната данъчна ставка на корпоративния данък/, "2027"), unit: "%", decimals: 0, tone: "sky", note: "Без промяна." },
        { label: "Данък върху дивидентите", value: printed(a, /^Данък, удържан при доходи от дивидентите/, "2027"), unit: "%", decimals: 0, tone: "mustard", note: "Без промяна." },
        { label: "Данък върху разходите в натура", value: inKind27, unit: "%", decimals: 0, tone: "rose", note: `2026: ${inKind26} %.` },
      ]}
      factsSource="Приложение № 2 към мотивите на законопроекта за държавния бюджет 2027 (основни допускания)."
      changes={[
        { title: "Данък върху свръхпечалбата", text: q("windfallTax"), source: QUOTES.windfallTax.where, sourceUrl: bill.url },
        { title: "Ваучери за храна", text: q("vouchers"), source: QUOTES.vouchers.where, sourceUrl: bill.url },
        { title: "Акциз за мощни автомобили", text: q("carExcise"), source: QUOTES.carExcise.where, sourceUrl: bill.url },
        { title: "Разходи в натура", text: `Данъкът върху разходите в натура става ${inKind27} % (от ${inKind26} % през 2026 г.).`, source: "Приложение № 2 към мотивите", sourceUrl: bill.url },
      ]}
      tools={[
        { href: "/biznes", title: "Бизнес", text: "Всички мерки, засягащи фирмите, с оценката на МФ.", icon: "briefcase" },
        { href: "/kalkulator", title: "Разход за служител", text: "Брутна заплата, осигуровки на работодателя и минимален осигурителен доход по дейност.", icon: "calculator" },
        { href: "/dogovori", title: "Обществени поръчки", text: "Подписаните договори през 2026 г.: кой възлага и на какво.", icon: "receipt" },
        { href: "/danatsi", title: "Данъци", text: "Всички данъчни ставки 2026–2029 и приходите по видове.", icon: "coins" },
      ]}
    />
  );
}
