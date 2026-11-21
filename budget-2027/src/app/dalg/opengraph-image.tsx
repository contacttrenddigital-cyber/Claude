import { getPublished } from "@/lib/data/published";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { BILL_SOURCE, metricFact } from "@/lib/og/facts";

export const revalidate = 3600;
export const alt = "Дългът по бюджет 2027";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const d = await getPublished();
  return ogCard({
    eyebrow: "Дълг",
    title: "Дългът и цената му",
    facts: [metricFact(d, "debt.government", "Държавен дълг", "lilac"), metricFact(d, "debt.government.pctGdp", "% от БВП", "sky"), metricFact(d, "kfp.expenditure.interest", "Лихви", "mustard")],
    source: `${BILL_SOURCE} (КФП, проект за 2027 г.).`,
  });
}
