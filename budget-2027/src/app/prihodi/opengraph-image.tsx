import { getPublished } from "@/lib/data/published";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { BILL_SOURCE, metricFact } from "@/lib/og/facts";

export const revalidate = 3600;
export const alt = "Приходите по бюджет 2027";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const d = await getPublished();
  return ogCard({
    eyebrow: "Приходи",
    title: "Откъде идват парите",
    facts: [metricFact(d, "kfp.revenue", "Приходи", "sky"), metricFact(d, "kfp.revenue.taxSocial", "Данъци и осигуровки", "mustard"), metricFact(d, "kfp.revenue.grants", "Помощи (основно ЕС)", "mint")],
    source: `${BILL_SOURCE} (КФП, проект за 2027 г.).`,
  });
}
