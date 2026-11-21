import { getPublished } from "@/lib/data/published";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { BILL_SOURCE, metricFact } from "@/lib/og/facts";

export const revalidate = 3600;
export const alt = "Дефицитът по бюджет 2027";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const d = await getPublished();
  return ogCard({
    eyebrow: "Дефицит",
    title: "Колко не достига",
    facts: [metricFact(d, "kfp.balance", "Салдо по КФП", "rose"), metricFact(d, "kfp.balance.pctGdp", "Салдо, % от БВП", "rose"), metricFact(d, "esa.balance.pctGdp", "По ЕСС 2010, % от БВП", "lilac")],
    source: `${BILL_SOURCE} (КФП, проект за 2027 г.).`,
  });
}
