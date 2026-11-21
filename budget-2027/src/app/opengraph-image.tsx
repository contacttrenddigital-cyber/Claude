import { getPublished } from "@/lib/data/published";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { BILL_SOURCE, metricFact } from "@/lib/og/facts";

export const revalidate = 3600;
export const alt = "Бюджет 2027, обяснен ясно: приходи, разходи и дефицит";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const d = await getPublished();
  return ogCard({
    eyebrow: "Законопроект · 2027",
    title: "Бюджет 2027, обяснен ясно",
    facts: [metricFact(d, "kfp.revenue", "Приходи", "sky", "млрд. €"), metricFact(d, "kfp.expenditure", "Разходи", "mustard", "млрд. €"), metricFact(d, "kfp.balance", "Салдо (дефицит)", "rose", "млрд. €")],
    source: `${BILL_SOURCE} (КФП, проект).`,
  });
}
