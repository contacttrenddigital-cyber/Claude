/**
 * Whole tables taken from the submitted 2027 bill (НС 52-602-01-71). Indices refer to
 * data/extracted/52-602-01-71.tables.json (stable for the file's SHA-256).
 */
import type { Vintage } from "@/lib/ingest/documents";
import type { ColumnSpec, TableSpec } from "./extract";

const years = (
  spec: [string, number, Vintage][],
  unit: string,
  suffix = "",
  labelSuffix = "",
): ColumnSpec[] => spec.map(([y, col, vintage]) => ({ key: `${y}${suffix}`, col, label: `${y}${labelSuffix}`, period: y, vintage, unit }));

const Y2629: [string, number, Vintage][] = [
  ["2026", 1, "expected"],
  ["2027", 2, "draft"],
  ["2028", 3, "forecast"],
  ["2029", 4, "forecast"],
];

export const TABLES: TableSpec[] = [
  {
    id: "functions",
    title: "Разходи по функции (КФП)",
    description: "Табл. III-1 от мотивите: разходи по КФП по функции, с разпределен резерв, без вноската в общия бюджет на ЕС.",
    table: 22,
    scope: "kfp",
    basis: "cash",
    labelCol: 0,
    firstDataRow: 4,
    columns: [
      ...years(Y2629, "млн. €"),
      ...years(
        [
          ["2026", 5, "expected"],
          ["2027", 6, "draft"],
          ["2028", 7, "forecast"],
          ["2029", 8, "forecast"],
        ],
        "%",
        "%",
        ", % БВП",
      ),
    ],
  },
  {
    id: "defense",
    title: "Разходи за отбрана",
    description: "Табл. III-2 от мотивите: разходи за отбрана по класификацията на НАТО и по националния бюджет.",
    table: 23,
    scope: "ministry",
    basis: "cash",
    labelCol: 0,
    firstDataRow: 1,
    columns: years(
      [
        ["2026", 1, "plan"],
        ["2027", 2, "draft"],
        ["2028", 3, "forecast"],
        ["2029", 4, "forecast"],
      ],
      "млн. €",
    ),
  },
  {
    id: "ceilings",
    title: "Тавани на разходите по бюджетни организации",
    description: "Приложение № 4 към мотивите: тавани на разходите по първостепенни разпоредители с бюджет за 2027–2029 г.",
    table: 36,
    scope: "ministry",
    basis: "cash",
    labelCol: 1,
    firstDataRow: 1,
    columns: years(
      [
        ["2027", 2, "draft"],
        ["2028", 3, "forecast"],
        ["2029", 4, "forecast"],
      ],
      "хил. €",
    ),
  },
  {
    id: "municipalities",
    title: "Основни бюджетни взаимоотношения с общините, 2027",
    description: "Чл. 52 от законопроекта: трансфери от централния бюджет към всяка община за 2027 г.",
    table: 6,
    scope: "municipal",
    basis: "cash",
    labelCol: 0,
    firstDataRow: 10,
    headerPattern: "^ОБЛАСТ ",
    totalLabel: "ВСИЧКО:",
    columns: [
      { key: "total", col: 1, label: "Основни бюджетни взаимоотношения", period: "2027", vintage: "draft", unit: "хил. €" },
      { key: "delegated", col: 2, label: "Обща субсидия за делегираните от държавата дейности", period: "2027", vintage: "draft", unit: "хил. €" },
      { key: "equalizing", col: 3, label: "Обща изравнителна субсидия", period: "2027", vintage: "draft", unit: "хил. €" },
      { key: "winter", col: 4, label: "За зимно поддържане и снегопочистване", period: "2027", vintage: "draft", unit: "хил. €" },
      { key: "capital", col: 5, label: "Целева субсидия за капиталови разходи", period: "2027", vintage: "draft", unit: "хил. €" },
    ],
  },
  {
    id: "municipalTotals",
    title: "Бюджетни взаимоотношения с общините, 2027–2029",
    description: "Приложение № 9 към мотивите: основните бюджетни взаимоотношения между централния бюджет и общините.",
    table: 41,
    scope: "municipal",
    basis: "cash",
    labelCol: 1,
    firstDataRow: 3,
    columns: years(
      [
        ["2027", 2, "draft"],
        ["2028", 3, "forecast"],
        ["2029", 4, "forecast"],
      ],
      "хил. €",
    ),
  },
  {
    id: "projects",
    title: "Приоритетни стратегически инвестиционни проекти с национално финансиране",
    description: "Приложение към чл. 107, ал. 1: проекти, капиталови разходи по години, индикатор и отговорна институция.",
    table: 8,
    scope: "program",
    basis: "cash",
    labelCol: 2,
    idCol: 1,
    firstDataRow: 1,
    columns: years(
      [
        ["2027", 3, "draft"],
        ["2028", 4, "forecast"],
        ["2029", 5, "forecast"],
      ],
      "хил. €",
    ),
    textCols: [
      { key: "indicator", col: 6, label: "Индикатор за резултат" },
      { key: "institution", col: 7, label: "Отговорна институция" },
    ],
  },
  {
    id: "debtStructure",
    title: "Структура на държавния дълг",
    description: "Табл. VI-2 от мотивите: матуритет, инструменти, лихви, валута и кредитори, 2025–2029.",
    table: 28,
    scope: "government-debt",
    basis: "stock",
    labelCol: 0,
    firstDataRow: 2,
    headerPattern: "^(Mатуритетна|Матуритетна|Структура на дълга|Лихвена|Валутна|Структура на държавните)",
    columns: years(
      [
        ["2025", 1, "actual"],
        ["2026", 2, "expected"],
        ["2027", 3, "draft"],
        ["2028", 4, "forecast"],
        ["2029", 5, "forecast"],
      ],
      "%",
    ),
  },
  {
    id: "execution2026",
    title: "Изпълнение на КФП към 30.09.2026 г.",
    description: "Приложение № 1 към мотивите: програма за 2026 г. и отчет към 30.09.2026 г. (национален бюджет и ЕС средства).",
    table: 34,
    scope: "kfp",
    basis: "cash",
    labelCol: 0,
    firstDataRow: 3,
    columns: [
      { key: "plan", col: 1, label: "Програма 2026", period: "2026", vintage: "plan", unit: "млн. €" },
      { key: "actual", col: 2, label: "Отчет към 30.09.2026 — КФП", period: "2026-01..2026-09", vintage: "actual", unit: "млн. €" },
      { key: "national", col: 3, label: "в т.ч. национален бюджет", period: "2026-01..2026-09", vintage: "actual", unit: "млн. €" },
      { key: "eu", col: 4, label: "в т.ч. средства от ЕС", period: "2026-01..2026-09", vintage: "actual", unit: "млн. €" },
      { key: "pct", col: 5, label: "Изпълнение спрямо програмата", period: "2026-01..2026-09", vintage: "actual", unit: "%" },
    ],
  },
  {
    id: "execution2025",
    title: "Изпълнение на КФП за 2025 г.",
    description: "Приложение № 1 към мотивите: програма и отчет за 2025 г.",
    table: 33,
    scope: "kfp",
    basis: "cash",
    labelCol: 0,
    firstDataRow: 3,
    columns: [
      { key: "plan", col: 1, label: "Програма 2025", period: "2025", vintage: "plan", unit: "млн. €" },
      { key: "actual", col: 2, label: "Отчет 31.12.2025 — КФП", period: "2025", vintage: "actual", unit: "млн. €" },
      { key: "national", col: 3, label: "в т.ч. национален бюджет", period: "2025", vintage: "actual", unit: "млн. €" },
      { key: "eu", col: 4, label: "в т.ч. средства от ЕС", period: "2025", vintage: "actual", unit: "млн. €" },
      { key: "pct", col: 5, label: "Изпълнение спрямо програмата", period: "2025", vintage: "actual", unit: "%" },
    ],
  },
  {
    id: "assumptions",
    title: "Основни допускания: данъци, осигуровки, социални плащания",
    description: "Приложение № 2 към мотивите (АСБП 2027–2029): ставки, прагове и размери за 2026–2029 г.",
    table: 35,
    scope: "parameter",
    basis: "statutory",
    labelCol: 1,
    firstDataRow: 2,
    columns: [
      { key: "2026", col: 3, label: "2026 г.", period: "2026", vintage: "plan", unit: "" },
      { key: "2027", col: 4, label: "2027 г.", period: "2027", vintage: "draft", unit: "" },
      { key: "2028", col: 5, label: "2028 г.", period: "2028", vintage: "forecast", unit: "" },
      { key: "2029", col: 6, label: "2029 г.", period: "2029", vintage: "forecast", unit: "" },
    ],
    textCols: [
      { key: "no", col: 0, label: "№" },
      { key: "unit", col: 2, label: "Мерна единица" },
    ],
  },
];

export function tableSpec(id: string): TableSpec {
  const t = TABLES.find((x) => x.id === id);
  if (!t) throw new Error(`unknown table ${id}`);
  return t;
}
