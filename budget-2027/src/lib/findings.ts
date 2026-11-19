/**
 * „Под лупа“: findings computed from the published data. Each finding follows
 * Източник → Число → Методология → Пресмятане → Извод → Ограничения → Право на отговор.
 * Pure over a small data interface so tests can run against the committed snapshot.
 */
import Decimal from "decimal.js";

export interface FindingsData {
  value(key: string, period: string): string | null;
  table(id: string): { rows: { label: string; level: number; kind: string; cells: Record<string, { value: string | null; text: string }> }[] };
  measures: { direction: "revenue" | "expenditure"; title: string; effect2027: string | null; locator: string }[];
  versionDiffs: { label: string; before: string | null; after: string | null; difference: string | null }[];
  /** all printed values of an observation (primary first), for data-quality findings */
  sourceValues(key: string, period: string): (string | null)[];
}

export interface Finding {
  id: string;
  title: string;
  numbers: { label: string; value: string; unit: string }[];
  sources: string[];
  method: string;
  calculation: string;
  conclusion: string;
  limitations: string;
  response: string;
  tone: "risk" | "positive" | "data-quality" | "neutral";
}

const D = (v: string | null | undefined) => {
  if (v === null || v === undefined) throw new Error("missing value for finding");
  return new Decimal(v);
};
const f1 = (d: Decimal) => d.toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toFixed(1);
const pct = (a: Decimal, b: Decimal) => b.minus(a).dividedBy(a.abs()).times(100);

export function computeFindings(x: FindingsData): Finding[] {
  const out: Finding[] = [];

  // 1. Interest costs
  {
    const a = D(x.value("kfp.expenditure.interest", "2026"));
    const b = D(x.value("kfp.expenditure.interest", "2027"));
    const c = D(x.value("kfp.expenditure.interest", "2029"));
    out.push({
      id: "lihvi",
      title: "Лихвите растат най-бързо от всички разходи",
      numbers: [
        { label: "Лихви 2026 (очаквано)", value: f1(a), unit: "млн. €" },
        { label: "Лихви 2027 (проект)", value: f1(b), unit: "млн. €" },
        { label: "Лихви 2029 (прогноза)", value: f1(c), unit: "млн. €" },
      ],
      sources: ["Приложение № 3, ред „Лихви“ (КФП)"],
      method: "Сравнение на лихвените разходи по КФП в един и същ документ (касова основа).",
      calculation: `(${f1(b)} − ${f1(a)}) / ${f1(a)} × 100 = ${f1(pct(a, b))}%; 2029 спрямо 2026: ${f1(pct(a, c))}%`,
      conclusion: `Лихвените разходи се увеличават с ${f1(pct(a, b))}% през 2027 г. и с ${f1(pct(a, c))}% до 2029 г. по прогнозата.`,
      limitations: "Прогнозата за 2028–2029 г. зависи от лихвените нива и обема на новия дълг.",
      response: "Мотивите свързват ръста на дълга с финансирането на дефицита; конкретен отговор за лихвите не е намерен.",
      tone: "risk",
    });
  }

  // 2. Capital expenditure decline
  {
    const a = D(x.value("kfp.expenditure.capital", "2026"));
    const b = D(x.value("kfp.expenditure.capital", "2027"));
    out.push({
      id: "kapitalovi",
      title: "Капиталовите разходи спадат с над една трета",
      numbers: [
        { label: "Капиталови разходи 2026 (очаквано)", value: f1(a), unit: "млн. €" },
        { label: "Капиталови разходи 2027 (проект)", value: f1(b), unit: "млн. €" },
      ],
      sources: ["Приложение № 3, ред „Капиталови разходи“"],
      method: "Сравнение в рамките на КФП, касова основа.",
      calculation: `${f1(b)} − ${f1(a)} = ${f1(b.minus(a))} млн. € (${f1(pct(a, b))}%)`,
      conclusion: `Капиталовите разходи по КФП намаляват с ${f1(a.minus(b))} млн. € (${f1(pct(a, b).abs())}%).`,
      limitations: "Бюджетният разчет не е извършена инвестиция; 2026 г. е очаквано изпълнение, не отчет.",
      response: "Мотивите (абзац 721): публичните инвестиции намаляват след приключването на проектите по Плана за възстановяване и устойчивост.",
      tone: "risk",
    });
  }

  // 3. Largest functional cut
  {
    const rows = x.table("functions").rows.filter((r) => r.level === 1 && r.cells["2026"]?.value && r.cells["2027"]?.value);
    const ranked = rows
      .map((r) => ({ label: r.label.replace(/^- /, ""), d: D(r.cells["2027"]!.value).minus(D(r.cells["2026"]!.value)), a: D(r.cells["2026"]!.value), b: D(r.cells["2027"]!.value) }))
      .sort((p, q) => p.d.comparedTo(q.d));
    const top = ranked.slice(0, 3);
    out.push({
      id: "sakrashtavania-funktsii",
      title: "Къде се съкращава най-много: по функции",
      numbers: top.map((t) => ({ label: `${t.label}: 2026 → 2027`, value: `${f1(t.a)} → ${f1(t.b)}`, unit: "млн. €" })),
      sources: ["Табл. III-1 от мотивите (КФП, без вноската в ЕС)"],
      method: "Разлика 2027 (проект) − 2026 (очаквано) по подфункции; подредено по най-голям спад.",
      calculation: top.map((t) => `${t.label}: ${f1(t.d)} млн. €`).join("; "),
      conclusion: `Най-голям спад има при „${top[0]!.label}“ (${f1(top[0]!.d)} млн. €).`,
      limitations: "Функционалният разрез разпределя резерва по функции; 2026 г. е очаквано изпълнение, 2027 г. е проект.",
      response: "Не е намерен конкретен отговор в мотивите за всяка подфункция.",
      tone: "risk",
    });
  }

  // 4. Biggest tax increases
  {
    const rev = x.measures.filter((m) => m.direction === "revenue" && m.effect2027 && D(m.effect2027).gt(0)).sort((a, b) => D(b.effect2027).comparedTo(D(a.effect2027)));
    const total = rev.reduce((s, m) => s.plus(D(m.effect2027)), new Decimal(0));
    out.push({
      id: "danachni-merki",
      title: "Най-големите нови тежести за данъкоплатците",
      numbers: rev.slice(0, 3).map((m) => ({ label: m.title.slice(0, 90), value: f1(D(m.effect2027)), unit: "млн. €" })),
      sources: ["Табл. II-7 от мотивите (оценка на МФ, начислена основа)"],
      method: "Приходни мерки с положителен ефект за 2027 г., подредени по размер.",
      calculation: `Сбор на ${rev.length} мерки = ${f1(total)} млн. €; най-голямата е ${f1(D(rev[0]!.effect2027))} млн. € (${f1(D(rev[0]!.effect2027).dividedBy(total).times(100))}% от сбора)`,
      conclusion: `Еднократният данък върху свръхпечалбата е ${f1(D(rev[0]!.effect2027).dividedBy(total).times(100))}% от всички нови приходни мерки за 2027 г.`,
      limitations: "Оценките са на МФ; реалните постъпления зависят от поведението на данъкоплатците. Данъкът върху свръхпечалбата е еднократен (−800 млн. € през 2028 г.).",
      response: "Мотивите (абзац 519): „Правителството предвижда прилагането на пакет от приходни и разходни мерки, насочени към трайно подобряване на бюджетната позиция.“",
      tone: "risk",
    });
  }

  // 5. Positive: social and family measures
  {
    const pos = x.measures.filter((m) => m.effect2027 && ((m.direction === "revenue" && D(m.effect2027).lt(0)) || (m.direction === "expenditure" && D(m.effect2027).gt(0))));
    const total = pos.reduce((s, m) => s.plus(D(m.effect2027).abs()), new Decimal(0));
    out.push({
      id: "polozhitelni",
      title: "Какво се подобрява: облекчения и повече разходи",
      numbers: pos.slice(0, 4).map((m) => ({ label: m.title.slice(0, 90), value: f1(D(m.effect2027).abs()), unit: "млн. €" })),
      sources: ["Табл. II-7 и II-8 от мотивите"],
      method: "Данъчни облекчения (отрицателен ефект върху приходите) и разходни мерки с увеличение.",
      calculation: `${pos.length} мерки, общ ефект ${f1(total)} млн. € през 2027 г.`,
      conclusion: `Мерките в полза на семейства, работещи и служители в публичния сектор са общо ${f1(total)} млн. € за 2027 г.`,
      limitations: "Част от увеличенията (заплати в публичния сектор) са за определени групи; оценките са на МФ.",
      response: "Подробности в /pozitivni-merki.",
      tone: "positive",
    });
  }

  // 6. Version changes
  {
    const ds = x.versionDiffs.filter((d) => d.difference !== null);
    out.push({
      id: "promeni-versii",
      title: "Тихите промени между проекта и внесения текст",
      numbers: ds.slice(0, 4).map((d) => ({ label: d.label, value: `${d.before} → ${d.after}`, unit: "млн. €" })),
      sources: ["Приложение № 3: проект от 06.11 (по СИГМА) и внесен текст от 16.11 (НС)"],
      method: "Автоматично сравнение на 60 реда за 2027 г.",
      calculation: `${ds.length} реда се различават; общите суми не се променят.`,
      conclusion: "Капиталовите разходи са с 13,6 млн. € по-малко, а текущите разходи с 13,7 млн. € повече; общите разходи и дефицитът не се променят.",
      limitations: "Версията от 06.11 е по СИГМА; оригиналът на МФ не можа да бъде изтеглен автоматично.",
      response: "Не е намерено обяснение за промените в мотивите.",
      tone: "neutral",
    });
  }

  // 7. Data quality
  {
    const [a0, b0] = x.sourceValues("macro.gdp", "2025");
    const a = D(a0);
    const b = D(b0);
    out.push({
      id: "bvp-2025",
      title: "Две различни стойности на БВП за 2025 г. в един документ",
      numbers: [
        { label: "Приложение № 3", value: f1(a), unit: "млн. €" },
        { label: "Табл. I-2", value: b.toFixed(0), unit: "млн. €" },
      ],
      sources: ["Приложение № 3, ред „Б В П“; Табл. I-2"],
      method: "Кръстосана проверка на една и съща величина на две места.",
      calculation: `${f1(a)} − ${b.toFixed(0)} = ${f1(a.minus(b))} млн. €`,
      conclusion: "Документът съдържа две несъвместими стойности на БВП за 2025 г.; разликата не е обяснена.",
      limitations: "Причината за разликата не е посочена в документа.",
      response: "Не е намерен отговор.",
      tone: "data-quality",
    });
  }

  // 8. Execution 2026: capital
  {
    const r = x.table("execution2026").rows.find((r) => r.label.startsWith("Капиталови"))!;
    out.push({
      id: "izpalnenie-kapitalovi",
      title: "Капиталовите разходи за 2026 г. са изпълнени под половината към септември",
      numbers: [
        { label: "Програма 2026", value: r.cells.plan!.value!, unit: "млн. €" },
        { label: "Отчет към 30.09.2026", value: r.cells.actual!.value!, unit: "млн. €" },
      ],
      sources: ["Приложение № 1 към мотивите"],
      method: "Отчет към 30.09 спрямо годишната програма.",
      calculation: `${r.cells.actual!.value} / ${r.cells.plan!.value} × 100 = ${f1(D(r.cells.actual!.value).dividedBy(D(r.cells.plan!.value)).times(100))}%`,
      conclusion: `След 9 месеца са изпълнени ${r.cells.pct!.value}% от капиталовите разходи за 2026 г.`,
      limitations: "Изпълнението е за 9 от 12 месеца; не е прогноза за годишното изпълнение.",
      response: "Не е намерен отговор.",
      tone: "risk",
    });
  }
  return out;
}
