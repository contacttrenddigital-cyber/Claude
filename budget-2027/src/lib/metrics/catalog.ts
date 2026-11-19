/**
 * Metric catalog: what each number means, its fiscal scope and accounting basis, and where it is
 * printed in the official 2027 budget bill (submitted to Parliament on 16.11.2026, вх. № 52-602-01-71).
 *
 * `sources[0]` is the primary location. Further sources are independent places in the same or
 * another official document; when they agree the observation is marked CROSS_CHECKED, when they
 * differ it is marked CONFLICT and shown as such.
 *
 * Docx table indices refer to data/extracted/52-602-01-71.tables.json (stable for this file hash).
 */
export type MetricScope =
  | "kfp"
  | "state-budget"
  | "general-government-esa"
  | "government-debt"
  | "economy"
  | "parameter";

export type Basis = "cash" | "accrual" | "stock" | "rate" | "statutory";

export type SourceSpec =
  | { kind: "annex3"; page: number; label: string; occurrence?: number }
  | { kind: "docxTable"; table: number; label: string; occurrence?: number; offset?: number; years?: string[] }
  | { kind: "docxAmount"; table: number; label: string; occurrence?: number; column: number; period: string }
  | { kind: "docxText"; contains: string; pattern: string; period?: string };

export interface MetricDef {
  key: string;
  label: string;
  short: string;
  definition: string;
  scope: MetricScope;
  basis: Basis;
  unit: "млрд. €" | "млн. €" | "хил. €" | "€" | "%";
  /** "pp" for shares/rates where changes must be expressed in percentage points. */
  changeIn: "percent" | "pp";
  sources: SourceSpec[];
}

const KFP_DEF =
  "Консолидирана фискална програма (КФП): държавен бюджет, ДОО, НЗОК, общини, сметки за средства от ЕС и други лица, без вътрешните трансфери. Касова основа.";

export const METRICS: MetricDef[] = [
  // ── КФП: приходи ─────────────────────────────────────────────────────────
  {
    key: "kfp.revenue",
    label: "Приходи, помощи и дарения по КФП",
    short: "Приходи",
    definition: `Всички приходи, помощи и дарения по КФП. ${KFP_DEF}`,
    scope: "kfp",
    basis: "cash",
    unit: "млн. €",
    changeIn: "percent",
    sources: [
      { kind: "annex3", page: 1, label: "Приходи, помощи и дарения" },
      { kind: "docxTable", table: 13, label: "ПРИХОДИ, ПОМОЩИ И ДАРЕНИЯ" },
    ],
  },
  {
    key: "kfp.revenue.pctGdp",
    label: "Приходи по КФП, % от БВП",
    short: "Приходи, % БВП",
    definition: "Приходи, помощи и дарения по КФП спрямо номиналния БВП от същия документ.",
    scope: "kfp",
    basis: "cash",
    unit: "%",
    changeIn: "pp",
    sources: [
      { kind: "annex3", page: 3, label: "Приходи, помощи и дарения" },
      { kind: "docxTable", table: 13, label: "% от БВП", occurrence: 1 },
    ],
  },
  {
    key: "kfp.revenue.taxSocial",
    label: "Данъчно-осигурителни приходи по КФП",
    short: "Данъци и осигуровки",
    definition: "Данъчни приходи и приходи от социални и здравни осигурителни вноски по КФП.",
    scope: "kfp",
    basis: "cash",
    unit: "млн. €",
    changeIn: "percent",
    sources: [
      { kind: "annex3", page: 1, label: "Данъчно-осигурителни приходи" },
      { kind: "docxTable", table: 13, label: "Данъчно-осигурителни приходи" },
    ],
  },
  {
    key: "kfp.revenue.nonTax",
    label: "Неданъчни приходи по КФП",
    short: "Неданъчни приходи",
    definition: "Такси, приходи от собственост, глоби, концесии, продажба на нефинансови активи и др.",
    scope: "kfp",
    basis: "cash",
    unit: "млн. €",
    changeIn: "percent",
    sources: [
      { kind: "annex3", page: 1, label: "Неданъчни приходи" },
      { kind: "docxTable", table: 13, label: "Неданъчни приходи" },
    ],
  },
  {
    key: "kfp.revenue.grants",
    label: "Помощи и дарения по КФП",
    short: "Помощи и дарения",
    definition: "Помощи и дарения от страната и от чужбина (основно средства от ЕС).",
    scope: "kfp",
    basis: "cash",
    unit: "млн. €",
    changeIn: "percent",
    sources: [
      { kind: "annex3", page: 1, label: "Помощи и дарения" },
      { kind: "docxTable", table: 13, label: "Помощи и дарения" },
    ],
  },
  ...(
    [
      ["kfp.revenue.vat", "ДДС", "ДДС", "Данък върху добавената стойност по КФП."],
      ["kfp.revenue.excise", "Акцизи", "Акцизи", "Акцизи по КФП."],
      ["kfp.revenue.pit", "Данъци върху доходите на физическите лица", "ДДФЛ", "Данъци върху доходите на физическите лица по КФП."],
      ["kfp.revenue.cit", "Корпоративни данъци", "Корпоративни данъци", "Корпоративни данъци по КФП (от нефинансови предприятия и финансови институции)."],
      ["kfp.revenue.social", "Приходи на социалното и здравното осигуряване", "Осигуровки", "Осигурителни вноски за ДОО и здравноосигурителни вноски по КФП."],
      ["kfp.revenue.property", "Имуществени данъци", "Имуществени данъци", "Имуществени данъци по КФП (общински)."],
    ] as const
  ).map(
    ([key, label, short, definition]): MetricDef => ({
      key,
      label: `${label} — КФП`,
      short,
      definition,
      scope: "kfp",
      basis: "cash",
      unit: "млн. €",
      changeIn: "percent",
      sources: [{ kind: "annex3", page: 1, label }],
    }),
  ),

  // ── КФП: разходи ─────────────────────────────────────────────────────────
  {
    key: "kfp.expenditure",
    label: "Общо разходи и вноска в бюджета на ЕС по КФП",
    short: "Разходи",
    definition: `Всички разходи по КФП плюс вноската на България в общия бюджет на ЕС. ${KFP_DEF}`,
    scope: "kfp",
    basis: "cash",
    unit: "млн. €",
    changeIn: "percent",
    sources: [
      { kind: "annex3", page: 2, label: "Общо разходи и Вноска в общия бюджет на ЕС" },
      { kind: "docxTable", table: 13, label: "ОБЩО РАЗХОДИ И ВНОСКА В БЮДЖЕТА НА ЕС" },
    ],
  },
  {
    key: "kfp.expenditure.pctGdp",
    label: "Разходи по КФП, % от БВП",
    short: "Разходи, % БВП",
    definition: "Общо разходи и вноска в бюджета на ЕС спрямо номиналния БВП от същия документ.",
    scope: "kfp",
    basis: "cash",
    unit: "%",
    changeIn: "pp",
    sources: [
      { kind: "annex3", page: 4, label: "Общо разходи и Вноска в общия бюджет на ЕС" },
      { kind: "docxTable", table: 13, label: "% от БВП", occurrence: 2 },
    ],
  },
  {
    key: "kfp.expenditure.excl",
    label: "Разходи по КФП (без вноската в ЕС)",
    short: "Разходи без вноска ЕС",
    definition: "Разходи по КФП без вноската в общия бюджет на ЕС.",
    scope: "kfp",
    basis: "cash",
    unit: "млн. €",
    changeIn: "percent",
    sources: [
      { kind: "annex3", page: 2, label: "Разходи" },
      { kind: "docxTable", table: 13, label: "Разходи" },
    ],
  },
  {
    key: "kfp.expenditure.interest",
    label: "Лихвени разходи по КФП",
    short: "Лихви",
    definition: "Платени лихви по държавния и общинския дълг (външни и вътрешни), касова основа.",
    scope: "kfp",
    basis: "cash",
    unit: "млн. €",
    changeIn: "percent",
    sources: [
      { kind: "annex3", page: 2, label: "Лихви" },
      { kind: "docxTable", table: 13, label: "Лихви" },
    ],
  },
  {
    key: "kfp.expenditure.capital",
    label: "Капиталови разходи по КФП",
    short: "Капиталови разходи",
    definition:
      "Разходи за придобиване на дълготрайни активи, основен ремонт и капиталови трансфери по КФП, включително по сметките за средства от ЕС. Разчетът не означава извършени инвестиции.",
    scope: "kfp",
    basis: "cash",
    unit: "млн. €",
    changeIn: "percent",
    sources: [{ kind: "annex3", page: 2, label: "Капиталови разходи" }],
  },
  {
    key: "kfp.expenditure.capital.pctGdp",
    label: "Капиталови разходи по КФП, % от БВП",
    short: "Капиталови, % БВП",
    definition: "Капиталови разходи по КФП спрямо номиналния БВП.",
    scope: "kfp",
    basis: "cash",
    unit: "%",
    changeIn: "pp",
    sources: [{ kind: "annex3", page: 4, label: "Капиталови разходи" }],
  },
  ...(
    [
      ["kfp.expenditure.current", "Текущи разходи", "Текущи разходи (вкл. лихви)"],
      ["kfp.expenditure.personnel", "Персонал", "Персонал"],
      ["kfp.expenditure.social", "Социални и здравноосигурителни плащания", "Социални плащания"],
      ["kfp.expenditure.pensions", "Пенсии", "Пенсии"],
      ["kfp.expenditure.health", "Здравноосигурителни плащания", "Здравноосигурителни плащания"],
      ["kfp.expenditure.subsidies", "Субсидии и други текущи трансфери - общо", "Субсидии"],
      ["kfp.expenditure.maintenance", "Издръжка - общо", "Издръжка"],
      ["kfp.expenditure.euContribution", "Вноска в общия бюджет на ЕС", "Вноска в ЕС"],
      ["kfp.expenditure.nonInterest", "Нелихвени разходи", "Нелихвени разходи"],
      ["kfp.expenditure.abroad", "Предоставени текущи и капиталови трансфери за чужбина", "Трансфери за чужбина"],
      ["kfp.expenditure.stateReserve", "Прираст на държавния резерв и изкупуване на земеделска продукция", "Държавен резерв"],
      ["kfp.expenditure.contingency", "Резерв за непредвидени и/или неотложни разходи", "Резерв за непредвидени разходи"],
    ] as const
  ).map(
    ([key, label, short]): MetricDef => ({
      key,
      label: `${label} — КФП`,
      short,
      definition: `Ред „${label}“ от Приложение № 3 (КФП 2025–2029), касова основа.`,
      scope: "kfp",
      basis: "cash",
      unit: "млн. €",
      changeIn: "percent",
      sources: [{ kind: "annex3", page: 2, label }],
    }),
  ),

  // ── КФП: салдо ───────────────────────────────────────────────────────────
  {
    key: "kfp.balance",
    label: "Бюджетно салдо по КФП",
    short: "Салдо по КФП",
    definition: `Приходи минус разходи (вкл. вноската в ЕС). Отрицателна стойност = дефицит. ${KFP_DEF}`,
    scope: "kfp",
    basis: "cash",
    unit: "млн. €",
    changeIn: "percent",
    sources: [
      { kind: "annex3", page: 2, label: "Бюджетно салдо (+/-)" },
      { kind: "docxTable", table: 13, label: "БЮДЖЕТНО САЛДО (+/-)" },
    ],
  },
  {
    key: "kfp.balance.pctGdp",
    label: "Бюджетно салдо по КФП, % от БВП",
    short: "Салдо по КФП, % БВП",
    definition: "Касово салдо по КФП спрямо номиналния БВП. Не е дефицитът по Маастрихт (ЕСС 2010).",
    scope: "kfp",
    basis: "cash",
    unit: "%",
    changeIn: "pp",
    sources: [
      { kind: "annex3", page: 4, label: "Бюджетно салдо (+/-)" },
      { kind: "docxTable", table: 13, label: "% от БВП", occurrence: 3 },
    ],
  },
  {
    key: "kfp.financing",
    label: "Финансиране на дефицита по КФП",
    short: "Финансиране",
    definition: "Нетно финансиране на салдото (заеми, депозити и др.). Равно по стойност и с обратен знак на салдото.",
    scope: "kfp",
    basis: "cash",
    unit: "млн. €",
    changeIn: "percent",
    sources: [
      { kind: "annex3", page: 2, label: "Финансиране (+/-)" },
      { kind: "docxTable", table: 13, label: "ФИНАНСИРАНЕ (+/-)" },
    ],
  },

  // ── ЕСС 2010, сектор „Държавно управление“ ──────────────────────────────
  {
    key: "esa.balance",
    label: "Баланс на сектор „Държавно управление“ (ЕСС 2010)",
    short: "Дефицит по ЕСС",
    definition:
      "Баланс на сектор „Държавно управление“ на начислена основа по ЕСС 2010. Това е показателят за критерия от 3% на ЕС; различен е от касовото салдо по КФП.",
    scope: "general-government-esa",
    basis: "accrual",
    unit: "млн. €",
    changeIn: "percent",
    sources: [{ kind: "docxTable", table: 17, label: "20. Баланс", offset: 0 }],
  },
  {
    key: "esa.balance.pctGdp",
    label: "Баланс по ЕСС 2010, % от БВП",
    short: "Дефицит по ЕСС, % БВП",
    definition: "Баланс на сектор „Държавно управление“ (начислена основа) спрямо БВП.",
    scope: "general-government-esa",
    basis: "accrual",
    unit: "%",
    changeIn: "pp",
    sources: [{ kind: "docxTable", table: 17, label: "20. Баланс", offset: 1 }],
  },
  {
    key: "esa.debt",
    label: "Консолидиран дълг на сектор „Държавно управление“",
    short: "Дълг по Маастрихт",
    definition: "Консолидиран брутен дълг на сектор „Държавно управление“ (ЕСС 2010) — показателят за критерия от 60% на ЕС.",
    scope: "general-government-esa",
    basis: "stock",
    unit: "млн. €",
    changeIn: "percent",
    sources: [{ kind: "docxTable", table: 17, label: "21. Консолидиран дълг на сектор „Държавно управление“", offset: 0 }],
  },
  {
    key: "esa.debt.pctGdp",
    label: "Консолидиран дълг (ЕСС), % от БВП",
    short: "Дълг по Маастрихт, % БВП",
    definition: "Консолидиран дълг на сектор „Държавно управление“ спрямо БВП.",
    scope: "general-government-esa",
    basis: "stock",
    unit: "%",
    changeIn: "pp",
    sources: [{ kind: "docxTable", table: 17, label: "21. Консолидиран дълг на сектор „Държавно управление“", offset: 1 }],
  },

  // ── Държавен дълг ────────────────────────────────────────────────────────
  {
    key: "debt.government",
    label: "Държавен дълг",
    short: "Държавен дълг",
    definition: "Номинален размер на държавния дълг (вътрешен и външен) към края на годината, по Закона за държавния дълг. Наличност, не поток.",
    scope: "government-debt",
    basis: "stock",
    unit: "млн. €",
    changeIn: "percent",
    sources: [{ kind: "docxTable", table: 27, label: "Държавен дълг, млн. евро" }],
  },
  {
    key: "debt.government.pctGdp",
    label: "Държавен дълг, % от БВП",
    short: "Дълг, % БВП",
    definition: "Държавен дълг към края на годината спрямо номиналния БВП.",
    scope: "government-debt",
    basis: "stock",
    unit: "%",
    changeIn: "pp",
    sources: [{ kind: "docxTable", table: 27, label: "Държавен дълг/БВП (%)" }],
  },
  {
    key: "debt.external",
    label: "Външен държавен дълг",
    short: "Външен дълг",
    definition: "Държавен дълг към нерезиденти.",
    scope: "government-debt",
    basis: "stock",
    unit: "млн. €",
    changeIn: "percent",
    sources: [{ kind: "docxTable", table: 27, label: "Външен дълг, млн. евро" }],
  },
  {
    key: "debt.domestic",
    label: "Вътрешен държавен дълг",
    short: "Вътрешен дълг",
    definition: "Държавен дълг към резиденти.",
    scope: "government-debt",
    basis: "stock",
    unit: "млн. €",
    changeIn: "percent",
    sources: [{ kind: "docxTable", table: 27, label: "Вътрешен дълг, млн. евро" }],
  },

  {
    key: "debt.newDebtLimit",
    label: "Максимален размер на новия държавен дълг за 2027 г.",
    short: "Таван на новия дълг",
    definition:
      "Горна граница на новия държавен дълг, който може да бъде поет през годината (чл. 68, ал. 1). Таван, а не прогноза за действително поетия дълг; включва и рефинансиране.",
    scope: "government-debt",
    basis: "statutory",
    unit: "млрд. €",
    changeIn: "percent",
    sources: [
      {
        kind: "docxText",
        contains: "Чл. 68. (1) Максималният размер на новия държавен дълг",
        pattern: "поет през годината по реда на Закона за държавния дълг, е (?<amount>\\d+,\\d+) млрд\\. евро",
        period: "2027",
      },
      {
        kind: "docxText",
        contains: "се определя максимален размер на новия държавен дълг",
        pattern: "поет през годината до (?<amount>\\d+,\\d+) млрд\\. евро",
        period: "2027",
      },
    ],
  },

  // ── Макрорамка ───────────────────────────────────────────────────────────
  {
    key: "macro.gdp",
    label: "Номинален БВП",
    short: "БВП",
    definition: "Брутен вътрешен продукт по текущи цени (знаменател за % от БВП).",
    scope: "economy",
    basis: "accrual",
    unit: "млн. €",
    changeIn: "percent",
    sources: [
      { kind: "annex3", page: 4, label: "Б В П" },
      { kind: "docxTable", table: 10, label: "БВП (млн. евро)" },
    ],
  },
  {
    key: "macro.gdpGrowth",
    label: "Реален растеж на БВП",
    short: "Растеж на БВП",
    definition: "Изменение на БВП в реално изражение спрямо предходната година, %.",
    scope: "economy",
    basis: "rate",
    unit: "%",
    changeIn: "pp",
    sources: [{ kind: "docxTable", table: 10, label: "БВП (реален растеж, %)" }],
  },
  {
    key: "macro.hicp",
    label: "Средногодишна инфлация (ХИПЦ)",
    short: "Инфлация (ХИПЦ)",
    definition: "Хармонизиран индекс на потребителските цени, средногодишно изменение, %.",
    scope: "economy",
    basis: "rate",
    unit: "%",
    changeIn: "pp",
    sources: [{ kind: "docxTable", table: 10, label: "Средногодишна инфлация (ХИПЦ) (%)" }],
  },
  {
    key: "macro.deflator",
    label: "Дефлатор на БВП",
    short: "Дефлатор на БВП",
    definition: "Изменение на общото ценово равнище в икономиката, %.",
    scope: "economy",
    basis: "rate",
    unit: "%",
    changeIn: "pp",
    sources: [{ kind: "docxTable", table: 10, label: "Дефлатор на БВП (%)" }],
  },
  {
    key: "macro.unemployment",
    label: "Коефициент на безработица (НРС)",
    short: "Безработица",
    definition: "Коефициент на безработица по Наблюдение на работната сила, %.",
    scope: "economy",
    basis: "rate",
    unit: "%",
    changeIn: "pp",
    sources: [{ kind: "docxTable", table: 10, label: "Коефициент на безработица (НРС) (%)" }],
  },
  {
    key: "macro.compensation",
    label: "Компенсации на един нает",
    short: "Компенсации на нает",
    definition: "Номинално изменение на компенсацията на един нает, %.",
    scope: "economy",
    basis: "rate",
    unit: "%",
    changeIn: "pp",
    sources: [{ kind: "docxTable", table: 10, label: "Компенсации на един нает (%)" }],
  },
  {
    key: "macro.investment",
    label: "Брутообразуване на основен капитал",
    short: "Инвестиции в икономиката",
    definition: "Реално изменение на брутообразуването на основен капитал (всички сектори), %.",
    scope: "economy",
    basis: "rate",
    unit: "%",
    changeIn: "pp",
    sources: [{ kind: "docxTable", table: 10, label: "Брутообразуване на основен капитал" }],
  },

  // ── Държавен бюджет (чл. 1 от законопроекта) ────────────────────────────
  {
    key: "stateBudget.revenue",
    label: "Приходи, помощи и дарения по държавния бюджет (чл. 1)",
    short: "Приходи на държавния бюджет",
    definition: "Приходите по републиканския (държавния) бюджет по чл. 1, ал. 1 от законопроекта. Не е КФП.",
    scope: "state-budget",
    basis: "cash",
    unit: "хил. €",
    changeIn: "percent",
    sources: [
      { kind: "docxAmount", table: 1, label: "ПРИХОДИ, ПОМОЩИ И ДАРЕНИЯ", column: 2, period: "2027" },
    ],
  },
  {
    key: "stateBudget.expenditure",
    label: "Разходи по държавния бюджет (чл. 1, ал. 2)",
    short: "Разходи на държавния бюджет",
    definition: "Разходите по държавния бюджет по чл. 1, ал. 2 (без трансферите към други бюджети). Не е КФП.",
    scope: "state-budget",
    basis: "cash",
    unit: "хил. €",
    changeIn: "percent",
    sources: [{ kind: "docxAmount", table: 1, label: "РАЗХОДИ", column: 2, period: "2027" }],
  },
  {
    key: "stateBudget.capital",
    label: "Капиталови разходи по държавния бюджет (чл. 1, ал. 2)",
    short: "Капиталови разходи (държавен бюджет)",
    definition: "Капиталови разходи по държавния бюджет — само републиканският бюджет, без ЕС сметки, общини и др.",
    scope: "state-budget",
    basis: "cash",
    unit: "хил. €",
    changeIn: "percent",
    sources: [{ kind: "docxAmount", table: 1, label: "Капиталови разходи", column: 2, period: "2027" }],
  },

  // ── Параметри ────────────────────────────────────────────────────────────
  {
    key: "param.minimumWage",
    label: "Минимална месечна работна заплата (прогнозен размер)",
    short: "Минимална заплата",
    definition:
      "Прогнозният размер на МРЗ, заложен при разработването на бюджета. Самата МРЗ се определя с постановление на Министерския съвет.",
    scope: "parameter",
    basis: "statutory",
    unit: "€",
    changeIn: "percent",
    sources: [
      {
        kind: "docxText",
        contains: "прогнозен размер на минималната работна заплата",
        pattern: "(?<amount>\\d[\\d ]*) евро за (?<year>20\\d\\d) г\\.",
      },
    ],
  },
  {
    key: "param.maxInsurableIncome",
    label: "Максимален месечен осигурителен доход",
    short: "Максимален осигурителен доход",
    definition: "Горната граница на месечния доход, върху който се дължат осигурителни вноски (заложена в мотивите).",
    scope: "parameter",
    basis: "statutory",
    unit: "€",
    changeIn: "percent",
    sources: [
      {
        kind: "docxText",
        contains: "увеличение на максималния осигурителен доход",
        pattern: "максималния осигурителен доход на (?<amount>\\d[\\d ]*) евро от 01\\.01\\.(?<year>20\\d\\d)",
      },
    ],
  },
];

export const METRIC_BY_KEY = new Map(METRICS.map((m) => [m.key, m]));

export function metric(key: string): MetricDef {
  const m = METRIC_BY_KEY.get(key);
  if (!m) throw new Error(`Unknown metric ${key}`);
  return m;
}
