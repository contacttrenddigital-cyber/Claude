# TASKS — Бюджет 2027

Статус: `[x]` готово и проверено · `[ ]` предстои · `[!]` блокирано (с причина)

## Фаза 0 — Настройка (този клон)
- [x] Инвентаризация на skills, MCP и инструменти в облачната среда
- [x] СИГМА Бюджет: MCP (7 инструмента) и отворени данни — проверени с реални заявки
- [x] Context7 MCP и Playwright MCP — проверени с реални заявки
- [x] Next.js 15 + TypeScript strict + Tailwind 4 scaffold (`budget-2027/`)
- [x] PostgreSQL 16 + Prisma 6: схема с произход, първа миграция приложена
- [x] Библиотеки `money.ts` (Decimal, евро/лев, reconcile) и `provenance/schema.ts` (gate за публикуване)
- [x] СИГМА клиент със zod валидация и отхвърляне на mock
- [x] Vitest (40 unit теста, coverage ≥ 90%), live договорни тестове (3), Playwright e2e (6, desktop+mobile, axe)
- [x] 8 проектни skills + валидатор `npm run check:skills`; потвърдено, че Claude Code ги зарежда
- [x] CLAUDE.md, docs/ARCHITECTURE.md, docs/DATA_SOURCES.md, docs/QUALITY_STANDARDS.md
- [x] CI workflow (GitHub Actions)
- [!] Достъп до първичните сайтове (minfin.bg, parliament.bg, dv.parliament.bg, nsi.bg, bnb.bg, ec.europa.eu) — не са в allowlist на средата
- [ ] Одобрение на проектните MCP сървъри при интерактивна сесия (`/mcp`) — решение на собственика

## Фаза 1 — След MASTER PROMPT
- [ ] Дизайн система: токени (светла/тъмна), типография, мрежа, компоненти; валидирана палитра (`dataviz`)
- [ ] Импортер СИГМА → PostgreSQL (Release, SourceDocument, Figure) с `explain_number` за всяко число
- [ ] Компонент `<SourcedFigure>` и `<SourceNote>`; графиките приемат само `FiscalFigure[]`
- [ ] Страници (по MASTER PROMPT)
- [ ] Модул „Проверка на твърдения“ (Claim/Verdict)
- [ ] Карта на общините (GeoJSON + таблична алтернатива)
- [ ] Security review преди първо публикуване; CSP
