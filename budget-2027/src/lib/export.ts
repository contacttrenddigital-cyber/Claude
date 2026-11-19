/** CSV/JSON export of published data with provenance metadata. Decimals use "." for machines. */
export function toCsv(header: string[], rows: (string | number | null)[][], meta: Record<string, string>): string {
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const metaLines = Object.entries(meta).map(([k, v]) => `# ${k}: ${v}`);
  return "﻿" + [...metaLines, header.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n") + "\n";
}
