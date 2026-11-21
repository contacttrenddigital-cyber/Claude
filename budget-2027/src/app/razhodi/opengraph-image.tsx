import { getPublished } from "@/lib/data/published";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { BILL_SOURCE, metricFact } from "@/lib/og/facts";

export const revalidate = 3600;
export const alt = "Разходите по бюджет 2027";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const d = await getPublished();
  return ogCard({
    eyebrow: "Разходи",
    title: "Къде отиват парите",
    facts: [metricFact(d, "kfp.expenditure", "Разходи", "sky"), metricFact(d, "kfp.expenditure.social", "Социални плащания", "mustard"), metricFact(d, "kfp.expenditure.capital", "Капиталови разходи", "mint")],
    source: `${BILL_SOURCE} (КФП, проект за 2027 г.).`,
  });
}
