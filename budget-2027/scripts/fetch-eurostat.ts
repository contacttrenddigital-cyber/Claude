/**
 * Download Eurostat gov_10dd_edpt1 (EDP deficit and debt, % of GDP) and gov_10a_exp (COFOG, 2015–2024) for the EU-27.
 * Raw bytes are stored under data/raw/eurostat/ with the dataset's "updated" date in the name;
 * the snapshot build hashes them. Run: npm run sources:eurostat
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { JsonStat, edptUrl } from "../src/lib/eurostat/jsonstat";
import { cofogUrl } from "../src/lib/eurostat/cofog";

export const EDPT_YEARS = ["2023", "2024", "2025"];

async function save(dataset: string, url: string) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Eurostat ${dataset}: ${res.status}`);
  const raw = await res.text();
  const ds = JsonStat.parse(JSON.parse(raw));
  const dir = join(__dirname, "../data/raw/eurostat");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${dataset}-${ds.updated.slice(0, 10)}.json`);
  writeFileSync(file, raw);
  writeFileSync(join(dir, `${dataset}.url`), url + "\n");
  console.log(`${ds.label}, updated ${ds.updated} → ${file}`);
}

async function main() {
  await save("gov_10dd_edpt1", edptUrl(EDPT_YEARS));
  await save("gov_10a_exp", cofogUrl());
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
