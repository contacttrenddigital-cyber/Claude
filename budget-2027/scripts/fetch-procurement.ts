/**
 * Monthly open data of the public procurement register (ЦАИС ЕОП, Агенция по обществени поръчки):
 * "Автоматично генерирани данни за договори, публикувани в ЦАИС ЕОП през месец MM.YYYY" (JSON).
 * Listed at https://app.eop.bg/today/reporting/open-data; files on storage.eop.bg.
 *
 *   npm run sources:procurement            (complete months of 2026 up to the last finished month)
 *
 * Raw bytes go to data/raw/procurement/ (not committed); the snapshot build hashes them.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(__dirname, "..", "data/raw/procurement");
export const contractsUrl = (ym: string) => {
  const [y, m] = ym.split("-");
  const name = `Автоматично генерирани данни за договори, публикувани в ЦАИС ЕОП през месец ${m}.${y}.json`;
  return `https://storage.eop.bg/open-data-${y}-${m}/${encodeURIComponent(name)}`;
};

async function main() {
  mkdirSync(DIR, { recursive: true });
  const now = new Date();
  const lastFull = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)); // last day of previous month
  const months: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const d = new Date(Date.UTC(2026, m - 1, 1));
    if (d > lastFull) break;
    months.push(`2026-${String(m).padStart(2, "0")}`);
  }
  const manifest: Record<string, { file: string; url: string; sha256: string; bytes: number; retrievedOn: string }> = existsSync(join(DIR, "manifest.json"))
    ? JSON.parse(readFileSync(join(DIR, "manifest.json"), "utf8"))
    : {};
  for (const ym of months) {
    const url = contractsUrl(ym);
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`✗ ${ym}: HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const sha = createHash("sha256").update(buf).digest("hex");
    const file = `contracts-${ym}.json`;
    writeFileSync(join(DIR, file), buf);
    manifest[ym] = { file, url, sha256: sha, bytes: buf.length, retrievedOn: new Date().toISOString().slice(0, 10) };
    console.log(`✓ ${ym}: ${(buf.length / 1e6).toFixed(1)} MB ${sha.slice(0, 12)}`);
  }
  writeFileSync(join(DIR, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
