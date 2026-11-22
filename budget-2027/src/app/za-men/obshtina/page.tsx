import type { Metadata } from "next";
import { RolePage } from "@/components/roles/RolePage";
import { MunicipalityPicker } from "@/components/roles/MunicipalityPicker";
import { Section } from "@/components/site/PageShell";
import { getPublished, tableOf } from "@/lib/data/published";
import { printed } from "@/lib/data/pick";
import { billSource } from "@/lib/data/view";
import { rescale } from "@/lib/format";
import { municipalitySlug } from "@/lib/municipal/slug";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Моята община: колко получава от държавата през 2027",
  description: "Избери община и виж трансфера от държавния бюджет за 2027 г., на жител и в сравнение с 2026 г.",
  alternates: { canonical: "/za-men/obshtina" },
};

export default async function MyMunicipality() {
  const data = await getPublished();
  const mt = tableOf(data, "municipalTotals");
  const bill = billSource(data);
  const mln = (re: RegExp) => rescale(printed(mt, re, "2027"), "хил. €", "млн. €");
  const items = [...data.municipalities]
    .map((m) => ({ slug: municipalitySlug(m, data.municipalities), name: m.name, region: m.region }))
    .sort((a, b) => a.name.localeCompare(b.name, "bg"));
  return (
    <RolePage
      eyebrow="За мен · община"
      title="Моята община"
      lead={<p>Колко пари получава всяка община от държавния бюджет. Това е трансферът от държавата, не целият бюджет на общината: собствените приходи и средствата от ЕС не са включени.</p>}
      facts={[
        { label: "Трансфери към общините, 2027", value: mln(/^Основни бюджетни взаимоотношения/), unit: "млн. €", tone: "sky", note: `За всичките ${data.municipalities.length} общини.` },
        { label: "Целева субсидия за капиталови разходи", value: mln(/^Целева субсидия за капиталови/), unit: "млн. €", tone: "mint", note: "За ремонти и инвестиции." },
      ]}
      factsSource="Приложение № 9 към мотивите (бюджетни взаимоотношения с общините, 2027–2029 г.), в хил. €, показано в млн. €."
      changes={[
        { title: "Делегирани дейности", text: "Общата субсидия за делегираните от държавата дейности (например образование и социални услуги) е основната част от трансфера.", source: "Приложение № 9 към мотивите", sourceUrl: bill.url },
        { title: "Капиталови разходи", text: "Целевата субсидия за капиталови разходи е предвидена в еднакъв размер за 2027, 2028 и 2029 г.", source: "Приложение № 9 към мотивите", sourceUrl: bill.url },
      ]}
      tools={[
        { href: "/obshtini", title: "Карта на общините", text: "Всички 265 общини на карта и в списък, на жител.", icon: "map" },
        { href: "/izpalnenie", title: "Изпълнение", text: "Как се изпълнява бюджетът месец по месец.", icon: "pie" },
        { href: "/dogovori", title: "Обществени поръчки", text: "Договорите на общините и другите възложители.", icon: "receipt" },
      ]}
    >
      <Section id="izberi" title="Избери своята община">
        <MunicipalityPicker items={items} />
      </Section>
    </RolePage>
  );
}
