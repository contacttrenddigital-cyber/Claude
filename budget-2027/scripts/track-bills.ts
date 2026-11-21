/**
 * Follow the three budget bills in the public API of the National Assembly.
 *
 *   npm run bills:track
 *
 * Downloads https://www.parliament.bg/api/v1/bill/{id}; when the JSON changed, keeps the new copy next to
 * the old ones (data/raw/parliament/bill_{id}.{date}.json, never overwrites) and points the manifest
 * (data/raw/parliament/bills.json) at it. Prints the stage and the events that are new since the last copy.
 * Exit code 2 = something changed: rebuild the snapshot (npm run snapshot:build) and review it.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BILLS } from "../src/lib/legislation/bills";
import { STAGES, billStatus } from "../src/lib/legislation/parliament";

const DIR = join(__dirname, "..", "data/raw/parliament");
const MANIFEST = join(DIR, "bills.json");
type Manifest = Record<string, { file: string; sha256: string; retrievedOn: string }>;

async function main() {
  const manifest: Manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
  const today = new Date().toISOString().slice(0, 10);
  let changed = 0;
  for (const bill of BILLS) {
    const res = await fetch(`https://www.parliament.bg/api/v1/bill/${bill.apiId}`, { headers: { "user-agent": "budget-2027-bill-tracker" } });
    if (!res.ok) {
      console.log(`✗ ${bill.sign}: HTTP ${res.status}; previous copy kept`);
      continue;
    }
    const text = await res.text();
    const sha = createHash("sha256").update(text).digest("hex");
    const prev = manifest[bill.apiId];
    const now = billStatus(JSON.parse(text));
    if (prev?.sha256 === sha) {
      console.log(`✓ ${bill.sign}: unchanged · ${STAGES[now.stage]} · комисии ${now.committees.reported}/${now.committees.assigned}`);
      continue;
    }
    changed++;
    const file = `bill_${bill.apiId}.${today}.json`;
    writeFileSync(join(DIR, file), text);
    const before = prev ? billStatus(JSON.parse(readFileSync(join(DIR, prev.file), "utf8"))) : null;
    const seen = new Set(before?.events.map((e) => `${e.type}|${e.date}|${e.title}`));
    manifest[bill.apiId] = { file, sha256: sha, retrievedOn: today };
    console.log(`! ${bill.sign}: CHANGED → ${file} · ${STAGES[now.stage]} · комисии ${now.committees.reported}/${now.committees.assigned}`);
    for (const e of now.events.filter((x) => !seen.has(`${x.type}|${x.date}|${x.title}`))) console.log(`    нов етап: ${e.date} ${e.title}`);
    if (now.gazette) console.log(`    ОБНАРОДВАН: ДВ бр. ${now.gazette.issue}/${now.gazette.year} — внеси текста на закона като нова версия (docs/DATA_REFRESH_AND_REVIEW.md)`);
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
  if (changed) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
