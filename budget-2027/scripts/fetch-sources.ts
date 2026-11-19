/**
 * Re-download the primary documents of the latest snapshot and verify their SHA-256.
 *
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/fetch-sources.ts
 *
 * A changed hash means the publisher replaced the file: the script reports it and stores the new
 * bytes next to the old ones (never overwrites), so a new version can be reviewed and imported.
 * SIGMA files are refreshed by build-snapshot.ts instead.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SnapshotSchema } from "../src/lib/ingest/snapshot-schema";

const ROOT = join(__dirname, "..");
const LOCAL: Record<string, string> = {
  "ns-52-602-01-71-docx": "parliament/52-602-01-71.docx",
  "ns-52-602-01-71-zip": "parliament/52-602-01-71.zip",
  "ns-52-602-01-68-rtf": "parliament/52-602-01-68.rtf",
  "ns-52-602-01-70-rtf": "parliament/52-602-01-70.rtf",
  "ns-api-bill-167645": "parliament/bill_167645.json",
  "ms-2026-11-16": "government/ms-2026-11-16.html",
};

async function main() {
  const latest = JSON.parse(readFileSync(join(ROOT, "data/snapshots/latest.json"), "utf8"));
  const snap = SnapshotSchema.parse(JSON.parse(readFileSync(join(ROOT, "data/snapshots", latest.file), "utf8")));
  let changed = 0;
  for (const d of snap.documents) {
    const rel = LOCAL[d.id];
    if (!rel) continue;
    const res = await fetch(d.url, { headers: { "user-agent": "budget-2027-source-check (+https://github.com)" } });
    if (!res.ok) {
      console.log(`✗ ${d.id}: HTTP ${res.status} — source unavailable, previous copy kept`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const sha = createHash("sha256").update(buf).digest("hex");
    const target = join(ROOT, "data/raw", rel);
    mkdirSync(join(target, ".."), { recursive: true });
    if (sha === d.sha256) {
      if (!existsSync(target)) writeFileSync(target, buf);
      console.log(`✓ ${d.id}: unchanged (${sha.slice(0, 12)})`);
    } else {
      changed++;
      const alt = `${target}.${sha.slice(0, 12)}`;
      writeFileSync(alt, buf);
      console.log(`! ${d.id}: CHANGED ${d.sha256.slice(0, 12)} → ${sha.slice(0, 12)}; saved as ${alt}. Review before importing.`);
    }
  }
  if (changed) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
