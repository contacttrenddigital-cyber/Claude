/**
 * Download Eurostat gov_10dd_edpt1 (EDP deficit and debt, % of GDP) for the EU-27.
 * Raw bytes are stored under data/raw/eurostat/ with the dataset's "updated" date in the name;
 * the snapshot build hashes them. Run: npm run sources:eurostat
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { JsonStat, edptUrl } from "../src/lib/eurostat/jsonstat";

export const EDPT_YEARS = ["2023", "2024", "2025"];

async function main() {
  const url = edptUrl(EDPT_YEARS);
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Eurostat ${res.status}`);
  const raw = await res.text();
  const ds = JsonStat.parse(JSON.parse(raw));
  const dir = join(__dirname, "../data/raw/eurostat");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `gov_10dd_edpt1-${ds.updated.slice(0, 10)}.json`);
  writeFileSync(file, raw);
  writeFileSync(join(dir, "gov_10dd_edpt1.url"), url + "\n");
  console.log(`${ds.label}, updated ${ds.updated} → ${file}`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
