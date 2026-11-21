import { siteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";
import { getPublished, tableOf } from "@/lib/data/published";
import { slugify } from "@/lib/slug";
import { municipalitySlug } from "@/lib/municipal/slug";

export const revalidate = 3600;

const STATIC = [
  "",
  "/prihodi",
  "/razhodi",
  "/defitsit",
  "/dalg",
  "/danatsi",
  "/osigurovki",
  "/pensii",
  "/zdraveopazvane",
  "/otbrana",
  "/sektori",
  "/obrazovanie",
  "/zaplati",
  "/biznes",
  "/riskove",
  "/sravnenia",
  "/investitsii",
  "/institutsii",
  "/programi",
  "/obshtini",
  "/izpalnenie",
  "/kalkulator",
  "/prognozi",
  "/scenarii",
  "/moeto-tablo",
  "/vizualizatsii",
  "/pod-lupa",
  "/pozitivni-merki",
  "/zakonodatelstvo",
  "/dokumenti",
  "/danni",
  "/iztochnitsi",
  "/metodologia",
  "/rechnik",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const data = await getPublished();
  const lastModified = new Date(data.snapshot.publishedAt);
  const inst = tableOf(data, "ceilings").rows.filter((r) => r.level === 0).map((r) => `/institutsii/${slugify(r.label)}`);
  const munis = data.municipalities.map((m) => `/obshtini/${municipalitySlug(m, data.municipalities)}`);
  return [...STATIC, ...inst, ...munis].map((p) => ({ url: `${base}${p}`, lastModified }));
}
