import type { Metadata } from "next";
import { RolePage } from "@/components/roles/RolePage";
import { getPublished, tableOf } from "@/lib/data/published";
import { printed } from "@/lib/data/pick";
import { billSource, lawSource } from "@/lib/data/view";
import { RULES_2026, RULES_2027 } from "@/lib/calc/rules";
import { fmtNum } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Работя на заплата: какво променя Бюджет 2027",
  description: "Минимална заплата, осигуровки, данък и облекчения за деца през 2027 г. за хората на трудов договор, с източник за всяко число.",
  alternates: { canonical: "/za-men/zaplata" },
};

export default async function Salary() {
  const data = await getPublished();
  const a = tableOf(data, "assumptions");
  const bill = billSource(data);
  const doo = lawSource(data, "ns-52-602-01-68-rtf");
  const mrz26 = printed(a, /^Размер на минималната работна заплата/, "2026");
  const mrz27 = printed(a, /^Размер на минималната работна заплата/, "2027");
  const max27 = printed(a, /^Максимален месечен размер на осигурителния доход/, "2027");
  const eur = (v: string, d = 2) => `${fmtNum(v, d)} €`;
  return (
    <RolePage
      eyebrow="За мен · трудов договор"
      title="Работя на заплата"
      lead={<p>Какво предлага бюджетът за 2027 г. на хората на трудов договор: заплата, осигуровки, данък и облекчения за деца. Колко точно ще получаваш, виж в калкулатора.</p>}
      facts={[
        { label: "Минимална работна заплата", value: mrz27, unit: "€", decimals: 0, tone: "mustard", note: `2026: ${eur(mrz26)}.` },
        { label: "Максимален осигурителен доход", value: max27, unit: "€", decimals: 0, tone: "sky", note: `Над тази сума не се плащат осигуровки (2026: ${eur(RULES_2026.periods.at(-1)!.maxInsurable.value, 0)} от август).` },
        { label: "Данък върху доходите", value: RULES_2027.pitRate.value, unit: "%", decimals: 0, tone: "mint", note: "Без промяна." },
      ]}
      factsSource="Приложение № 2 към мотивите на законопроекта за държавния бюджет 2027 (основни допускания)."
      changes={[
        { title: "Минимална работна заплата", text: `Става ${eur(mrz27, 0)} от ${eur(mrz26)} през 2026 г.`, source: "Приложение № 2 към мотивите", sourceUrl: bill.url },
        {
          title: "Облекчение за деца",
          text: `Годишното облекчение за едно дете става ${eur(RULES_2027.childRelief.one.value, 0)} (от ${eur(RULES_2026.childRelief.one.value)}), за две — ${eur(RULES_2027.childRelief.two.value, 0)}, за три и повече — ${eur(RULES_2027.childRelief.threePlus.value, 0)}.`,
          source: "мотиви към законопроекта, абзац 844",
          sourceUrl: bill.url,
        },
        {
          title: "Облекчението всеки месец",
          text: `Ново: облекчението може да се ползва всеки месец чрез работодателя — по ${eur(RULES_2027.monthlyAdvanceRelief!.one)} на месец по-малка данъчна основа при едно дете.`,
          source: "мотиви към законопроекта, абзац 931",
          sourceUrl: bill.url,
        },
        {
          title: "Разходи за здраве, образование и спорт на децата",
          text: `Ново облекчение: такива разходи до ${eur(RULES_2027.childDevelopmentCap!.one, 0)} годишно при едно дете (${eur(RULES_2027.childDevelopmentCap!.two, 0)} при две, ${eur(RULES_2027.childDevelopmentCap!.threePlus, 0)} при три и повече) намаляват данъчната основа.`,
          source: "мотиви към законопроекта, абзац 932",
          sourceUrl: bill.url,
        },
        { title: "Осигуровки", text: `Ставките остават същите; максималният осигурителен доход става ${eur(max27, 0)}.`, source: "законопроект за бюджета на ДОО 2027, чл. 9, т. 3", sourceUrl: doo.url },
        { title: "Минимален осигурителен доход", text: "Минималните осигурителни доходи по дейности и професии се увеличават с 6,4 % (ръста на минималната заплата).", source: "мотиви към законопроекта за бюджета на ДОО 2027", sourceUrl: doo.url },
      ]}
      tools={[
        { href: "/kalkulator", title: "Калкулатор", text: "Нетната ти заплата и осигуровките: 2026 срещу 2027.", icon: "calculator" },
        { href: "/zaplati", title: "Заплати", text: "Минималната заплата и заплатите в държавата.", icon: "wallet" },
        { href: "/osigurovki", title: "Осигуровки и помощи", text: "Всички ставки и социални плащания.", icon: "coins" },
      ]}
    />
  );
}
