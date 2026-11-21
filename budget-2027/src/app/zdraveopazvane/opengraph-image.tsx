import { getPublished, tableOf } from "@/lib/data/published";
import { fmtNum, rescale } from "@/lib/format";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { amount } from "@/lib/social/derived";

export const revalidate = 3600;
export const alt = "Здравеопазването и бюджетът на НЗОК за 2027 г.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const d = await getPublished();
  const rev = tableOf(d, "nzokRevenue");
  const exp = tableOf(d, "nzokExpenditure");
  const mln = (v: string) => fmtNum(rescale(v, "хил. €", "млн. €"), 1);
  return ogCard({
    eyebrow: "Здраве и НЗОК",
    title: "Здравеопазването и здравната каса",
    facts: [
      { label: "Бюджет на НЗОК", value: mln(amount(rev, "total")), unit: "млн. €", tone: "sky" },
      { label: "Здравни вноски", value: mln(amount(rev, "1.1.")), unit: "млн. €", tone: "mustard" },
      { label: "Болнична помощ", value: mln(amount(exp, "1.1.3.7.")), unit: "млн. €", tone: "mint" },
    ],
    source: "законопроект за бюджета на НЗОК 2027 (НС, № 52-602-01-70), чл. 1.",
  });
}
