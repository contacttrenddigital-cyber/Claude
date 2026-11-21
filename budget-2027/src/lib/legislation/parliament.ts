/**
 * Stages of a bill from the public API of the National Assembly (https://www.parliament.bg/api/v1/bill/{id}).
 * Pure: the caller passes the stored JSON (with its SHA-256 in the snapshot); nothing is fetched here.
 *
 * Field meaning, checked against enacted bills (e.g. 165300 → ДВ бр. 39/2024):
 *  - stan_list   — committee reports for the first vote;  stan_list2 — reports for the second vote
 *  - activity    — "зала първо гласуване" / "зала второ гласуване" with "приет" / "отхвърлен"
 *  - L_Act_dv_iss / L_Act_dv_year — issue of the State Gazette; L_Act_date2 — date the law was passed
 */
import { z } from "zod";

const Report = z.object({ A_Cm_Stan_date: z.string(), A_ns_C_id: z.number(), A_ns_CL_value: z.string(), L_Act_St_name: z.string() });
const Activity = z.object({ L_Act_St_date: z.string(), L_Act_St_name: z.string(), L_Act_St2_name: z.string(), A_ns_CL_value: z.string().nullable().optional() });

export const BillApiSchema = z.object({
  L_Act_id: z.number(),
  L_Act_sign: z.string(),
  L_ActL_title: z.string(),
  L_Act_date: z.string(),
  L_Act_date2: z.string().nullable(),
  L_Act_dv_iss: z.string().nullable(),
  L_Act_dv_year: z.union([z.number(), z.string()]).nullable(),
  withdrawn: z.boolean(),
  dist_list: z.array(z.object({ A_ns_C_id: z.number(), A_ns_CL_value: z.string(), L_Act_DTL_value: z.string() })),
  stan_list: z.array(Report),
  stan_list2: z.array(Report),
  activity: z.array(Activity),
  proposal_12_list: z.array(z.unknown()),
});
export type BillApi = z.infer<typeof BillApiSchema>;

export const STAGES = ["Внесен в НС", "Доклади на комисиите", "Първо гласуване в зала", "Предложения и доклад за второ гласуване", "Второ гласуване в зала", "Обнародван в ДВ"] as const;

export interface BillEvent {
  date: string; // YYYY-MM-DD
  type: "SUBMITTED" | "COMMITTEE_REPORTS" | "LEAD_COMMITTEE_REPORT" | "FIRST_READING" | "SECOND_READING_REPORT" | "SECOND_READING" | "PROMULGATED" | "REJECTED";
  title: string;
}

export interface BillStatus {
  sign: string;
  title: string;
  /** index in STAGES of the last stage reached */
  stage: number;
  committees: { assigned: number; reported: number; lead: string | null; leadReported: boolean };
  events: BillEvent[];
  rejected: boolean;
  gazette: { issue: string; year: string } | null;
}

const day = (s: string) => s.slice(0, 10);

export function billStatus(raw: unknown): BillStatus {
  const b = BillApiSchema.parse(raw);
  const lead = b.dist_list.find((d) => d.L_Act_DTL_value === "водеща") ?? null;
  const reports = [...b.stan_list].sort((x, y) => x.A_Cm_Stan_date.localeCompare(y.A_Cm_Stan_date));
  const reportedIds = new Set(reports.map((r) => r.A_ns_C_id));
  const leadReport = lead ? reports.find((r) => r.A_ns_C_id === lead.A_ns_C_id) : undefined;
  const hall = (vote: string, result: string) => b.activity.find((a) => a.L_Act_St2_name === `зала ${vote} гласуване` && a.L_Act_St_name === result);

  const events: BillEvent[] = [{ date: day(b.L_Act_date), type: "SUBMITTED", title: `Внесен в Народното събрание (№ ${b.L_Act_sign})` }];
  const others = reports.filter((r) => r.A_ns_C_id !== lead?.A_ns_C_id);
  if (others.length > 0)
    events.push({
      date: others.at(-1)!.A_Cm_Stan_date,
      type: "COMMITTEE_REPORTS",
      title: `Доклади за първо гласуване от ${others.length} от ${b.dist_list.length - (lead ? 1 : 0)} участващи комисии`,
    });
  if (leadReport) events.push({ date: leadReport.A_Cm_Stan_date, type: "LEAD_COMMITTEE_REPORT", title: `Доклад на водещата комисия (${lead!.A_ns_CL_value}) за първо гласуване` });
  const first = hall("първо", "приет");
  const firstNo = hall("първо", "отхвърлен");
  if (first) events.push({ date: first.L_Act_St_date, type: "FIRST_READING", title: "Приет на първо гласуване в пленарна зала" });
  if (firstNo) events.push({ date: firstNo.L_Act_St_date, type: "REJECTED", title: "Отхвърлен на първо гласуване в пленарна зала" });
  const r2 = lead ? b.stan_list2.find((r) => r.A_ns_C_id === lead.A_ns_C_id) : b.stan_list2[0];
  if (r2) events.push({ date: r2.A_Cm_Stan_date, type: "SECOND_READING_REPORT", title: "Доклад на водещата комисия за второ гласуване" });
  const second = hall("второ", "приет");
  if (second) events.push({ date: second.L_Act_St_date, type: "SECOND_READING", title: "Приет на второ гласуване: законът е приет" });
  const gazette = b.L_Act_dv_iss && b.L_Act_dv_iss.trim() ? { issue: b.L_Act_dv_iss.trim(), year: String(b.L_Act_dv_year ?? "") } : null;
  if (gazette) events.push({ date: second ? second.L_Act_St_date : day(b.L_Act_date2 ?? b.L_Act_date), type: "PROMULGATED", title: `Обнародван в „Държавен вестник“, бр. ${gazette.issue}/${gazette.year}` });

  const stage = gazette ? 5 : second ? 4 : r2 || b.proposal_12_list.length > 0 ? 3 : first ? 2 : reports.length > 0 ? 1 : 0;
  return {
    sign: b.L_Act_sign,
    title: b.L_ActL_title,
    stage,
    committees: { assigned: b.dist_list.length, reported: reportedIds.size, lead: lead?.A_ns_CL_value ?? null, leadReported: !!leadReport },
    events: events.sort((x, y) => x.date.localeCompare(y.date)),
    rejected: !!firstNo || b.withdrawn,
    gazette,
  };
}

const STAGE_OF: Partial<Record<BillEvent["type"], number>> = {
  COMMITTEE_REPORTS: 1,
  LEAD_COMMITTEE_REPORT: 1,
  FIRST_READING: 2,
  SECOND_READING_REPORT: 3,
  SECOND_READING: 4,
  PROMULGATED: 5,
};

/** Stage reached, from the event types stored in the snapshot (0 = only submitted). */
export function stageFromEvents(types: string[]): number {
  return types.reduce((m, t) => Math.max(m, STAGE_OF[t as BillEvent["type"]] ?? 0), 0);
}
