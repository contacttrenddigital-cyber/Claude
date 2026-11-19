import { slugify } from "@/lib/slug";

/** Municipality URL slug; names repeat (e.g. „Бяла“ in Варна and Русе), so duplicates get the region. */
export function municipalitySlug(m: { name: string; region: string }, all: { name: string }[]): string {
  const dup = all.filter((x) => x.name === m.name).length > 1;
  return dup ? `${slugify(m.name)}-${slugify(m.region)}` : slugify(m.name);
}
