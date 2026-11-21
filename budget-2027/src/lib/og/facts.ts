/** Headline numbers for Open Graph cards, read from the published snapshot (same series as the pages). */
import { point } from "@/lib/data/derive";
import { seriesOf, type Published } from "@/lib/data/published";
import { fmtNum, rescale } from "@/lib/format";
import type { OgFact, OgTone } from "./card";

/** 2027 value of a catalog metric, optionally rescaled (e.g. млн. € → млрд. €). Throws if missing. */
export function metricFact(data: Published, key: string, label: string, tone: OgTone, show?: string, decimals = 1): OgFact {
  const s = seriesOf(data, key);
  const p = point(s, "2027");
  if (!p || p.value === null) throw new Error(`OG: ${key} has no 2027 value`);
  const unit = s.metric.unit;
  const v = show && show !== unit ? rescale(p.value, unit, show) : p.value;
  return { label, value: fmtNum(v, decimals), unit: show ?? unit, tone };
}

export const BILL_SOURCE = "законопроект за държавния бюджет 2027 (НС, № 52-602-01-71), мотиви и Приложение № 3";
