/**
 * Tables of the social insurance (ДОО, НС 52-602-01-68) and health insurance (НЗОК, НС 52-602-01-70)
 * budget bills for 2027, with their reconciliation checks.
 */
import type { DocxExtract } from "@/lib/ingest/documents";
import type { Check } from "@/lib/ingest/snapshot";
import type { ExtractedTable } from "./extract";
import { fundsSummaryTable, lawBalanceCheck, lawSectionAsTable, lawTreeChecks, parseLawSections, section } from "./law";

export const DOO_TABLES = [0, 1, 2];
export const NZOK_TABLES = [0, 1];
export const DOO_FUND_ARTICLES = [1, 2, 3, 4, 5, 6, 7, 8];

export function socialFundTables(
  doo: DocxExtract,
  nzok: DocxExtract,
  ids: { doo: string; nzok: string },
): { tables: ExtractedTable[]; checks: Check[] } {
  const d = parseLawSections(doo, DOO_TABLES);
  const n = parseLawSections(nzok, NZOK_TABLES);
  const dm = { documentId: ids.doo, file: doo.file, scope: "social-security" };
  const nm = { documentId: ids.nzok, file: nzok.file, scope: "health-insurance" };
  const tables = [
    fundsSummaryTable(d, DOO_FUND_ARTICLES, {
      ...dm,
      id: "dooFunds",
      title: "Бюджет на ДОО по фондове, 2027",
      description: "Законопроект за бюджета на ДОО за 2027 г., чл. 1–8: приходи, разходи и салдо на консолидирания бюджет, на всеки фонд и на НОИ.",
    }),
    lawSectionAsTable(section(d, 1, 1), {
      ...dm,
      id: "dooRevenue",
      title: "Консолидиран бюджет на ДОО: приходи и трансфери, 2027",
      description: "Законопроект за бюджета на ДОО за 2027 г., чл. 1, ал. 1.",
    }),
    lawSectionAsTable(section(d, 1, 2), {
      ...dm,
      id: "dooExpenditure",
      title: "Консолидиран бюджет на ДОО: разходи и трансфери, 2027",
      description: "Законопроект за бюджета на ДОО за 2027 г., чл. 1, ал. 2.",
    }),
    lawSectionAsTable(section(d, 2, 2), {
      ...dm,
      id: "dooPensionsFund",
      title: "Фонд „Пенсии“: разходи и трансфери, 2027",
      description: "Законопроект за бюджета на ДОО за 2027 г., чл. 2, ал. 2.",
    }),
    lawSectionAsTable(section(n, 1, 1), {
      ...nm,
      id: "nzokRevenue",
      title: "Бюджет на НЗОК: приходи и трансфери, 2027",
      description: "Законопроект за бюджета на НЗОК за 2027 г., чл. 1, ал. 1.",
    }),
    lawSectionAsTable(section(n, 1, 2), {
      ...nm,
      id: "nzokExpenditure",
      title: "Бюджет на НЗОК: разходи и трансфери, 2027",
      description: "Законопроект за бюджета на НЗОК за 2027 г., чл. 1, ал. 2.",
    }),
  ];
  const checks: Check[] = [
    ...d.flatMap((s) => lawTreeChecks("doo", "Бюджет на ДОО", s)),
    ...n.flatMap((s) => lawTreeChecks("nzok", "Бюджет на НЗОК", s)),
    ...DOO_FUND_ARTICLES.map((a) => lawBalanceCheck("doo", "Бюджет на ДОО", section(d, a, 1), section(d, a, 2), section(d, a, 3))),
  ];
  return { tables, checks };
}
