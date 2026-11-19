/**
 * Join municipalities from the bill (чл. 52 table, by region + printed name) to official codes.
 * Key = municipality code (e.g. "BGS01"); names are only used to find the code, with explicit aliases.
 * Every bill row must match exactly one code; unmatched rows are returned, never dropped silently.
 */
export interface CodeEntry {
  id: string;
  name: string;
  region: string;
  lawName?: string;
}

const HOMOGLYPHS: Record<string, string> = { T: "Т", A: "А", B: "В", E: "Е", K: "К", M: "М", H: "Н", O: "О", P: "Р", C: "С", X: "Х", a: "а", e: "е", o: "о", p: "р", c: "с", x: "х" };

/** Name spellings that differ between the law and the NSI list (documented by SIGMA). */
const ALIASES: Record<string, string> = {
  добричка: "добрич-селска",
  бобовдол: "бобов дол",
  "столична община": "столична",
};

export function normName(s: string): string {
  const t = s
    .split("")
    .map((ch) => HOMOGLYPHS[ch] ?? ch)
    .join("")
    .replace(/[„“”"«»']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return ALIASES[t] ?? t;
}

export function normRegion(s: string): string {
  return normName(s.replace(/^ОБЛАСТ\s+/i, "")).replace(/ ?\(столица\)|-град| град$/g, "").trim();
}

export interface JoinResult<T> {
  matched: { code: string; entry: CodeEntry; row: T }[];
  unmatched: T[];
  duplicates: string[];
}

export function joinByName<T extends { label: string; group: string | null }>(rows: T[], codes: CodeEntry[]): JoinResult<T> {
  const index = new Map<string, CodeEntry[]>();
  for (const c of codes) {
    for (const n of new Set([normName(c.name), c.lawName ? normName(c.lawName) : null].filter(Boolean) as string[])) {
      const list = index.get(n) ?? [];
      list.push(c);
      index.set(n, list);
    }
  }
  const matched: JoinResult<T>["matched"] = [];
  const unmatched: T[] = [];
  const used = new Map<string, number>();
  for (const r of rows) {
    const candidates = index.get(normName(r.label)) ?? [];
    const region = r.group ? normRegion(r.group) : null;
    const pick = candidates.length === 1 ? candidates : candidates.filter((c) => region && normRegion(c.region) === region);
    if (pick.length !== 1) {
      unmatched.push(r);
      continue;
    }
    matched.push({ code: pick[0]!.id, entry: pick[0]!, row: r });
    used.set(pick[0]!.id, (used.get(pick[0]!.id) ?? 0) + 1);
  }
  const duplicates = [...used].filter(([, n]) => n > 1).map(([id]) => id);
  return { matched, unmatched, duplicates };
}
