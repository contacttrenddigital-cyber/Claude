import Decimal from "decimal.js";
import { getPublished } from "@/lib/data/published";
import { fmtNum, rescale } from "@/lib/format";
import { municipalitySlug } from "@/lib/municipal/slug";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";

export const revalidate = 3600;
export const alt = "Трансферите от държавата към общината за 2027 г.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getPublished();
  const all = d.municipalities;
  const m = all.find((x) => municipalitySlug(x, all) === slug);
  if (!m) return ogCard({ eyebrow: "Общини", title: "Колко получава всяка община" });
  const rank = [...all].sort((a, b) => new Decimal(b.perCapita2027).comparedTo(a.perCapita2027)).findIndex((x) => x.code === m.code) + 1;
  return ogCard({
    eyebrow: `Област ${m.region}`,
    title: `Община ${m.name}`,
    facts: [
      { label: "На жител, 2027", value: fmtNum(m.perCapita2027, 0), unit: "€", tone: "sky" as const },
      // an empty cell stays out of the card (no zero in its place)
      ...(m.y2027.total ? [{ label: "Общо от държавата", value: fmtNum(rescale(m.y2027.total, "хил. €", "млн. €"), 1), unit: "млн. €", tone: "mustard" as const }] : []),
      { label: "Място по трансфер на жител", value: String(rank), unit: `от ${all.length}`, tone: "mint" as const },
    ],
    source: "законопроект за ДБ 2027, Приложение № 9 (трансфери); население 01.01.2024 г., Евростат GISCO.",
  });
}
