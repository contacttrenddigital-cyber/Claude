/** Generates docs/FISCAL_DATA_DICTIONARY.md from the metric catalog (single source of truth). */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { METRICS, type SourceSpec } from "../src/lib/metrics/catalog";

const where = (s: SourceSpec) =>
  s.kind === "annex3"
    ? `Приложение № 3, с. ${s.page}, ред „${s.label}“${s.occurrence ? ` (${s.occurrence}-ро срещане)` : ""}`
    : s.kind === "docxTable"
      ? `таблица ${s.table} в DOCX, ред „${s.label}“${s.offset ? `, подколона +${s.offset}` : ""}`
      : s.kind === "docxAmount"
        ? `таблица ${s.table} (чл. 1), ред „${s.label}“`
        : `текст: „${s.contains}…“`;

const SCOPE: Record<string, string> = {
  kfp: "КФП",
  "state-budget": "Държавен бюджет (чл. 1 ЗДБ)",
  "general-government-esa": "Сектор „Държавно управление“ (ЕСС 2010)",
  "government-debt": "Държавен дълг (ЗДД)",
  economy: "Икономика (макро)",
  parameter: "Параметър",
};
const BASIS: Record<string, string> = { cash: "касова", accrual: "начислена", stock: "наличност", rate: "темп/ставка", statutory: "нормативна" };

const rows = METRICS.map(
  (m) =>
    `| \`${m.key}\` | ${m.label} | ${SCOPE[m.scope]} | ${BASIS[m.basis]} | ${m.unit} | ${m.changeIn === "pp" ? "пр.п." : "%"} | ${m.sources.map(where).join("<br>")} |`,
);
const md = `# Речник на фискалните данни

> Генериран автоматично от \`budget-2027/src/lib/metrics/catalog.ts\` с \`npm run docs:dictionary\`. Не редактирай на ръка.

Всеки показател има ключ, обхват, основа и мерна единица. Първият източник е основният; следващите са независими места в документа за кръстосана проверка (статус \`cross_checked\` при съвпадение с печатната точност, \`conflict\` при разлика). Промените на дялове и темпове се изразяват в процентни пунктове (пр.п.), на нива — в проценти.

Документ: законопроект за ДБРБ 2027 с мотиви (АСБП 2027–2029), НС вх. № 52-602-01-71, SHA-256 \`183c1863afb530446fa9a2eb34ea253de7ef83e48270b0550b7546787fb2db0f\`.

| Ключ | Показател | Обхват | Основа | Единица | Промяна в | Къде в документа |
|---|---|---|---|---|---|---|
${rows.join("\n")}

## Определения

${METRICS.map((m) => `- **${m.label}** (\`${m.key}\`): ${m.definition}`).join("\n")}
`;
writeFileSync(join(__dirname, "../../docs/FISCAL_DATA_DICTIONARY.md"), md);
console.log(`${METRICS.length} metrics → docs/FISCAL_DATA_DICTIONARY.md`);
