/** Archive of political statements about Budget 2027 and their verification (data/claims/*.json). */
import { z } from "zod";

export const VERDICTS = ["Потвърдено", "Частично вярно", "Подвеждащо", "Невярно", "Недостатъчно данни", "Прогноза", "Мнение"] as const;
export type Verdict = (typeof VERDICTS)[number];

const dec = z.string().regex(/^-?\d+(\.\d+)?$/);

export const FigureCheck = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("docxRow"), file: z.string(), table: z.number(), label: z.string(), year: z.string() }),
  z.object({ kind: z.literal("docxCell"), file: z.string(), table: z.number(), label: z.string(), col: z.number() }),
  z.object({ kind: z.literal("annex3"), page: z.number(), label: z.string(), year: z.string() }),
  z.object({ kind: z.literal("paragraph"), file: z.string(), paragraph: z.number(), contains: z.string() }),
  z.object({ kind: z.literal("text"), file: z.string(), contains: z.string() }),
  z.object({ kind: z.literal("measure"), table: z.number(), startsWith: z.string() }),
  z.object({ kind: z.literal("measuresPositiveSum"), table: z.number() }),
]);
export type FigureCheck = z.infer<typeof FigureCheck>;

export const Figure = z.object({
  id: z.string(),
  label: z.string(),
  value: dec.nullable(),
  unit: z.string().nullable(),
  documentId: z.string(),
  /** null = value taken from a secondary dataset or derived; explained in the claim */
  check: FigureCheck.nullable(),
});

export const Calculation = z.object({
  op: z.enum(["diff", "pct_change", "ratio", "share", "sum", "per_capita"]),
  /** figure ids, or literal decimals (e.g. "4000") */
  inputs: z.array(z.string()).min(1),
  result: dec,
  unit: z.string(),
  formula: z.string(),
});

export const Claim = z.object({
  id: z.string(),
  topic: z.string(),
  kind: z.enum(["factual", "forecast", "opinion"]),
  /** short verbatim quotation (copyright: max ~40 words) */
  quote: z.string().max(320),
  figures: z.array(Figure),
  calculation: Calculation.nullable(),
  verdict: z.enum(VERDICTS),
  reasoning: z.string(),
  context: z.string().nullable(),
  governmentPosition: z.string().nullable(),
});
export type Claim = z.infer<typeof Claim>;

export const ClaimsArchive = z
  .object({
    speaker: z.string(),
    speakerRole: z.string(),
    reviewedOn: z.string(),
    reviewer: z.string(),
    method: z.string(),
    coverage: z.object({
      searched: z.array(z.string()),
      notAccessible: z.array(z.object({ source: z.string(), reason: z.string() })),
      note: z.string(),
    }),
    documents: z.array(
      z.object({
        id: z.string(),
        publisher: z.string(),
        title: z.string(),
        url: z.string().url(),
        publishedAt: z.string().nullable(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        note: z.string().nullable(),
      }),
    ),
    statements: z.array(
      z.object({
        id: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        title: z.string(),
        platform: z.string(),
        documentIds: z.array(z.string()).min(1),
        budgetVersion: z.string(),
        summary: z.string(),
        claims: z.array(Claim),
      }),
    ),
  })
  .superRefine((a, ctx) => {
    // forecasts and opinions are never marked true/false
    for (const s of a.statements)
      for (const c of s.claims) {
        if (c.kind === "forecast" && !["Прогноза", "Мнение"].includes(c.verdict))
          ctx.addIssue({ code: "custom", message: `${c.id}: forecast must have verdict Прогноза/Мнение` });
        if (c.kind === "opinion" && c.verdict !== "Мнение") ctx.addIssue({ code: "custom", message: `${c.id}: opinion must have verdict Мнение` });
        if (c.quote.split(/\s+/).length > 40) ctx.addIssue({ code: "custom", message: `${c.id}: quote longer than 40 words` });
      }
  });
export type ClaimsArchive = z.infer<typeof ClaimsArchive>;
