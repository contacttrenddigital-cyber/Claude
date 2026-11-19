/**
 * Payroll tax & social-security rules for a labour contract (НАП категория 1, III категория труд),
 * 2026 (in force) and 2027 (as PROPOSED in the budget bill — not law).
 *
 * Every parameter carries its citation. tests/unit/payroll-rules.test.ts re-reads the printed
 * values from the extracted documents and fails if any constant here drifts from the source.
 */

export interface Citation {
  documentId: string;
  locator: string;
  /** exact printed fragment */
  quote: string;
}

export interface Param {
  value: string;
  citations: Citation[];
}

/** Contribution rates in % of the insurable income, split employer : employee. */
export interface ContributionRates {
  pensions: { employer: string; employee: string };
  /** universal pension fund (only for persons born after 31.12.1959) */
  upf: { employer: string; employee: string };
  sickness: { employer: string; employee: string };
  unemployment: { employer: string; employee: string };
  health: { employer: string; employee: string };
}

export interface RulePeriod {
  from: string; // YYYY-MM-DD
  to: string;
  months: number;
  maxInsurable: Param;
  minWage: Param;
}

export interface YearRules {
  year: 2026 | 2027;
  legalStatus: "in-force" | "proposed";
  legalStatusLabel: string;
  pitRate: Param;
  periods: RulePeriod[];
  /** after 1959 (with UPF) and before 1960 (no UPF; pensions take the UPF share) */
  ratesAfter1959: ContributionRates;
  ratesBefore1960: ContributionRates;
  tzpbRange: { min: string; max: string; citation: Citation };
  /** annual child tax relief (deduction from the annual tax base), чл. 22в ЗДДФЛ */
  childRelief: { one: Param; two: Param; threePlus: Param };
  /** чл. 22г ЗДДФЛ, child with ≥ 50 % disability */
  disabledChildRelief: Param;
  /** monthly advance relief through the employer (2027 proposal only) */
  monthlyAdvanceRelief?: { one: string; two: string; threePlus: string; disabled: string; citation: Citation };
  /** new child-development relief: cap on deductible actual expenses (2027 proposal only) */
  childDevelopmentCap?: { one: string; two: string; threePlus: string; citation: Citation };
}

const BILL = "ns-52-602-01-71-docx";
const DOO = "ns-52-602-01-68-rtf";
const NZOK = "ns-52-602-01-70-rtf";
const A2 = "Приложение № 2 към АСБП 2027–2029 (таблица 35)";

const c = (documentId: string, locator: string, quote: string): Citation => ({ documentId, locator, quote });

/** Shared statutory rates (unchanged 2026 → 2027 per Приложение № 2, rows 11–13 and 20). */
function rates(before1960: boolean): ContributionRates {
  return before1960
    ? {
        pensions: { employer: "11.02", employee: "8.78" },
        upf: { employer: "0", employee: "0" },
        sickness: { employer: "2.1", employee: "1.4" },
        unemployment: { employer: "0.6", employee: "0.4" },
        health: { employer: "4.8", employee: "3.2" },
      }
    : {
        pensions: { employer: "8.22", employee: "6.58" },
        upf: { employer: "2.8", employee: "2.2" },
        sickness: { employer: "2.1", employee: "1.4" },
        unemployment: { employer: "0.6", employee: "0.4" },
        health: { employer: "4.8", employee: "3.2" },
      };
}

export const RATE_CITATIONS: Citation[] = [
  c(BILL, `${A2}, ред 11.1`, "14,8 за родените след 31 декември 1959 г."),
  c(BILL, `${A2}, ред 11.3`, "за фонд „Общо заболяване и майчинство” … 3,5"),
  c(BILL, `${A2}, ред 11.5`, "за фонд „Безработица” … 1"),
  c(BILL, `${A2}, ред 12`, "Размер на осигурителната вноска за здравно осигуряване … 8"),
  c(BILL, `${A2}, ред 13`, "Размер на осигурителните вноски за допълнително задължително пенсионно осигуряване … 5"),
  c(BILL, `${A2}, ред 20.1 и 20.3`, "60:40"),
  c(BILL, `${A2}, ред 20.2`, "11,02:8,78 за лицата родени преди 1 януари 1960 г.; 8,22:6,58 за лицата, родени след 31 декември 1959 г."),
  c(NZOK, "мотиви към законопроекта за бюджета на НЗОК 2027", "здравноосигурителната вноска от 8 на сто … за 2027 г. е 60:40"),
];

const TZPB = { min: "0.4", max: "1.1", citation: c(BILL, `${A2}, ред 11.4`, "от 0,4 до 1,1 на сто в зависимост от степента на риска") };

export const RULES_2026: YearRules = {
  year: 2026,
  legalStatus: "in-force",
  legalStatusLabel: "в сила (ЗДБ, ЗБДОО и ЗБНЗОК за 2026 г.)",
  pitRate: { value: "10", citations: [c(BILL, `${A2}, ред 3`, "Данък върху доходите на физическите лица, основна ставка … 10")] },
  periods: [
    {
      from: "2026-01-01",
      to: "2026-07-31",
      months: 7,
      maxInsurable: { value: "2111.64", citations: [c(BILL, `${A2}, ред 18`, "2 111,64 , считано от1 януари")] },
      minWage: { value: "550.66", citations: [c(BILL, `${A2}, ред 19`, "550,66, считано от  1 януари")] },
    },
    {
      from: "2026-08-01",
      to: "2026-12-31",
      months: 5,
      maxInsurable: { value: "2300", citations: [c(BILL, `${A2}, ред 18`, "2300, считано от1 август")] },
      minWage: { value: "620.20", citations: [c(BILL, `${A2}, ред 10`, "Размер на минималната работна заплата … 620,20")] },
    },
  ],
  ratesAfter1959: rates(false),
  ratesBefore1960: rates(true),
  tzpbRange: TZPB,
  childRelief: {
    one: { value: "3067.75", citations: [c(BILL, "мотиви, абзац 844", "за едно дете от 3 067,75 евро")] },
    two: { value: "6135.50", citations: [c(BILL, "мотиви, абзац 844", "за две деца от 6 135,50 евро")] },
    threePlus: { value: "9203.25", citations: [c(BILL, "мотиви, абзац 844", "за три и повече деца от 9 203,25 евро")] },
  },
  disabledChildRelief: { value: "6135.50", citations: [c(BILL, "мотиви, абзац 844", "за едно дете с увреждане от 6 135,50 евро")] },
};

export const RULES_2027: YearRules = {
  year: 2027,
  legalStatus: "proposed",
  legalStatusLabel: "предложено в законопроектите за 2027 г. — не е прието",
  pitRate: { value: "10", citations: [c(BILL, `${A2}, ред 3`, "Данък върху доходите на физическите лица, основна ставка … 10")] },
  periods: [
    {
      from: "2027-01-01",
      to: "2027-12-31",
      months: 12,
      maxInsurable: {
        value: "2400",
        citations: [
          c(BILL, `${A2}, ред 18`, "Максимален месечен размер на осигурителния доход … 2 400"),
          c(DOO, "законопроект за бюджета на ДОО 2027, чл. 9, т. 3", "максимален месечен размер на осигурителния доход – 2 400 евро"),
        ],
      },
      minWage: {
        value: "660",
        citations: [
          c(BILL, `${A2}, ред 10`, "Размер на минималната работна заплата … 660"),
          c(BILL, "мотиви, абзац 589", "660 евро за 2027 г."),
        ],
      },
    },
  ],
  ratesAfter1959: rates(false),
  ratesBefore1960: rates(true),
  tzpbRange: TZPB,
  childRelief: {
    one: { value: "5000", citations: [c(BILL, "мотиви, абзац 844", "на 5 000 евро")] },
    two: { value: "10000", citations: [c(BILL, "мотиви, абзац 844", "от 6 135,50 евро на 10 000 евро")] },
    threePlus: { value: "15000", citations: [c(BILL, "мотиви, абзац 844", "от 9 203,25 евро на 15 000 евро")] },
  },
  disabledChildRelief: { value: "12000", citations: [c(BILL, "мотиви, абзац 844", "от 6 135,50 евро на 12 000 евро")] },
  monthlyAdvanceRelief: {
    one: "416.66",
    two: "833.33",
    threePlus: "1250",
    disabled: "1000",
    citation: c(BILL, "мотиви, абзац 931", "работодателят намалява месечната данъчна основа … с 416,66 евро при едно дете, 833,33 евро при две деца, 1 250 евро при три и повече деца и 1 000 евро за дете с увреждане"),
  },
  childDevelopmentCap: {
    one: "2000",
    two: "4000",
    threePlus: "6000",
    citation: c(BILL, "мотиви, абзац 932", "до 2 000 евро при едно ненавършило пълнолетие дете, до 4 000 евро при две деца и до 6 000 евро при три и повече деца"),
  },
};

export const RULES = { 2026: RULES_2026, 2027: RULES_2027 } as const;
