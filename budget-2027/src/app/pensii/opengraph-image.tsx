import { getPublished, tableOf } from "@/lib/data/published";
import { fmtNum, rescale } from "@/lib/format";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { amount, dooFunding } from "@/lib/social/derived";

export const revalidate = 3600;
export const alt = "Пенсиите и бюджетът на ДОО за 2027 г.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const d = await getPublished();
  const rev = tableOf(d, "dooRevenue");
  const exp = tableOf(d, "dooExpenditure");
  const mln = (v: string) => fmtNum(rescale(v, "хил. €", "млн. €"), 1);
  return ogCard({
    eyebrow: "Пенсии и ДОО",
    title: "Пенсиите и общественото осигуряване",
    facts: [
      { label: "Бюджет на ДОО", value: mln(amount(rev, "total")), unit: "млн. €", tone: "mustard" },
      { label: "Пенсии", value: mln(amount(exp, "1.1.")), unit: "млн. €", tone: "sky" },
      { label: "От централния бюджет", value: mln(dooFunding(rev).central.part), unit: "млн. €", tone: "violet" },
    ],
    source: "законопроект за бюджета на ДОО 2027 (НС, № 52-602-01-68), чл. 1.",
  });
}
