/**
 * Minimum insurable income by main economic activity and occupation group.
 *  - 2027: Приложение № 1 към чл. 9, т. 1 of the ДОО bill (52-602-01-68), extracted from the RTF;
 *  - 2026: ЗБДОО 2026, Приложения № 1 (до 31.07) and № 1А (от 01.08), via SIGMA (rates.json).
 * The bill's motives say every 2026 amount (Приложение № 1А) is raised by the growth of the minimum
 * wage, 6.4 %: `modChecks` verifies that for every cell (rounded to whole euro).
 * Cells that are empty in the law stay null (no minimum is printed there).
 */
import Decimal from "decimal.js";
import { z } from "zod";
import type { Check } from "@/lib/ingest/snapshot";
import type { TableData } from "@/lib/ingest/snapshot-schema";

export const MOD_GROUPS = [
  "Ръководители",
  "Специалисти",
  "Техници и приложни специалисти",
  "Помощен административен персонал",
  "Персонал, зает с услуги за населението, търговията и охраната",
  "Квалифицирани работници в селското, горското, ловното и рибното стопанство",
  "Квалифицирани работници и сродни на тях занаятчии",
  "Машинни оператори и монтажници",
  "Професии, неизискващи специална квалификация",
] as const;

const Num = z.number().nullable();
export const SigmaModSchema = z.object({
  rows: z.array(z.object({ no: z.number(), code: z.string(), name: z.string(), until: z.array(Num).length(9), from: z.array(Num).length(9) })).length(86),
});

export interface ModRow {
  no: number;
  code: string;
  name: string;
  /** euro per month, as printed; null = empty cell */
  y2026until: (string | null)[];
  y2026from: (string | null)[];
  y2027: (string | null)[];
}

const AMOUNT = /^\d{3,4},\d{2}$/;

/** Rows of the bill's table (cells as extracted) + SIGMA 2026 → one row per activity. */
export function modRows(billRows: string[][], sigma2026: z.infer<typeof SigmaModSchema>): ModRow[] {
  // activity rows start with their number and carry at least one amount (the "1 2 … 9" column-number row has none)
  const data = billRows.filter((r) => /^\d{1,2}$/.test((r.find((c) => c.trim()) ?? "").trim()) && r.some((c) => AMOUNT.test(c.trim())));
  if (data.length !== 86) throw new Error(`МОД 2027: expected 86 activity rows, got ${data.length}`);
  return data.map((r, i) => {
    const no = Number(r.find((c) => c.trim())!.trim());
    const s = sigma2026.rows[i]!;
    if (s.no !== no) throw new Error(`МОД: row ${no} does not line up with ЗБДОО 2026 row ${s.no}`);
    // amounts in reading order; the layout of a few rows is shifted by a column, so they are placed into
    // the groups that are not empty in the 2026 law (Приложение № 1А) and then verified against it
    const amounts = r.filter((c) => AMOUNT.test(c.trim())).map((c) => c.trim().replace(",", "."));
    const filled = s.from.map((v) => v !== null);
    if (amounts.length !== filled.filter(Boolean).length) throw new Error(`МОД row ${no}: ${amounts.length} amounts vs ${filled.filter(Boolean).length} groups in 2026`);
    let k = 0;
    const y2027 = filled.map((f) => (f ? amounts[k++]! : null));
    const str = (v: number | null) => (v === null ? null : new Decimal(v).toFixed(2));
    return { no, code: s.code, name: s.name, y2026until: s.until.map(str), y2026from: s.from.map(str), y2027 };
  });
}

/** 2027 = 2026 (from 01.08) × 1.064, rounded to whole euro, for every printed cell. */
export function modChecks(rows: ModRow[]): Check[] {
  const bad: string[] = [];
  let n = 0;
  for (const r of rows)
    r.y2027.forEach((v, g) => {
      const f = r.y2026from[g];
      if (v === null || f === null) return;
      n++;
      if (!new Decimal(f).times("1.064").toDecimalPlaces(0, Decimal.ROUND_HALF_UP).eq(v)) bad.push(`${r.no}/${g + 1}`);
    });
  return [
    {
      id: "mod:2027:growth",
      kind: "identity",
      status: bad.length === 0 ? "pass" : "fail",
      description: `МОД 2027 = МОД от 01.08.2026 × 1,064 (ръстът на МРЗ по мотивите), закръглено до евро, за ${n} клетки`,
      details: { mismatched: bad.join(", ") || "—" },
    },
  ];
}

/** Snapshot table: one row per activity, columns "<period>:<group 1–9>" (2026u, 2026f, 2027). */
export function modTable(rows: ModRow[], documentId: string): TableData {
  const sets = [
    ["2026u", "2026-01", "plan", "2026 до 31.07"],
    ["2026f", "2026-08", "plan", "2026 от 01.08"],
    ["2027", "2027", "draft", "2027 (проект)"],
  ] as const;
  return {
    id: "minInsurable",
    title: "Минимален осигурителен доход по икономически дейности и групи професии, € на месец",
    description:
      "2027: Приложение № 1 към чл. 9, т. 1 от законопроекта за бюджета на ДОО; 2026: ЗБДОО 2026, Приложения № 1 и № 1А (по СИГМА). Празна клетка: в закона няма размер.",
    caption: "Приложение № 1 към чл. 9, т. 1 (законопроект за бюджета на ДОО 2027)",
    scope: "ДОО",
    basis: "закон",
    documentId,
    file: "52-602-01-68.rtf",
    tableIndex: 3,
    columns: sets.flatMap(([p, period, vintage, label]) =>
      MOD_GROUPS.map((g, i) => ({ key: `${p}:${i + 1}`, col: i + 1, label: `${label}: ${g}`, period, vintage, unit: "€" })),
    ),
    textColumns: [{ key: "code", label: "Код по КИД" }],
    rows: rows.map((r, i) => ({
      label: r.name,
      level: 0,
      kind: "data" as const,
      group: null,
      rowIndex: i + 1,
      texts: { code: r.code },
      cells: Object.fromEntries(
        (
          [
            ["2026u", r.y2026until],
            ["2026f", r.y2026from],
            ["2027", r.y2027],
          ] as const
        ).flatMap(([p, vals]) => vals.map((v, g) => [`${p}:${g + 1}`, { value: v, text: v ?? "" }])),
      ),
    })),
  };
}
