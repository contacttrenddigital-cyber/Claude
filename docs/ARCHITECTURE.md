# Архитектура — Бюджет 2027

## Цели
1. Всяко показано число е проследимо до официален документ (документ → страница/клетка → SHA-256).
2. Числата са точни (decimal), сравненията — методологично коректни.
3. Бърз, достъпен (WCAG 2.2 AA), мобилен първо интерфейс на български.

## Слоеве
```
 Официални документи (МФ, НС, ДВ, НСИ, БНБ, Евростат)
        │                         ▲ проследяване (explain_number, sha256)
        ▼                         │
 СИГМА Бюджет (open data JSON + MCP)   ← проверен вторичен източник
        │  src/lib/sigma/client.ts (zod, отхвърля mock)
        ▼
 Импортер (scripts/, Фаза 1) ── Release / SourceDocument / Figure ──► PostgreSQL (Prisma)
        │
        ▼
 Домейн: src/lib/fiscal/money.ts (Decimal, единици, евро/лев, reconcile)
         src/lib/provenance/schema.ts (FiscalFigure, assertPublishable, checkComparable)
        │
        ▼
 Next.js App Router (RSC): страници → <SourcedFigure>, графики (Recharts/D3) само от FiscalFigure[]
```

## Директории
```
/CLAUDE.md, /TASKS.md, /docs/          правила и планове
/.claude/skills/                       8 проектни skills
/.claude/settings.json, /.mcp.json     MCP и разрешения
/scripts/playwright-mcp.sh             стартер на Playwright MCP (облак/локално)
/budget-2027/
  src/app/                             Next.js App Router
  src/lib/fiscal/                      пари и единици
  src/lib/provenance/                  модел на произхода
  src/lib/sigma/                       СИГМА клиент
  prisma/schema.prisma, migrations/    модел на данните
  tests/unit, tests/integration        Vitest (integration = live, opt-in)
  e2e/                                 Playwright + axe
  scripts/check-skills.mjs             валидатор на skills
```

## Модел на данните (Prisma)
- `Publisher` → `SourceDocument` (url, **sha256 unique**, legalStatus, publishedOn, retrievedAt)
- `Release` (source, version, asOf) — напр. СИГМА `dataVersion`
- `Figure` (key, label, `Decimal(24,6)` value, unit, scope, status, period, asOf, **document задължителен**, locator, sigmaRecord, verifiedAt/By)
- `Municipality` (официален код, население с дата)
- `Claim` ↔ `ClaimFigure` ↔ `Figure`, `Verdict`
- Уникалност `[key, period, status, documentId]` — проект и закон за една и съща година съжителстват, не се презаписват.

## Решения
| Решение | Причина |
|---|---|
| decimal.js, стойности като низ | без float грешки; СИГМА връща низове в provenance |
| zod на границите | невалидни/mock данни не влизат в системата |
| СИГМА като основен канал, първичните като проверка | СИГМА е отворена, версионирана и дава клетка+хеш; първичните сайтове засега са блокирани в облака |
| Статичен/ISR рендер | данните се сменят на месечни отчети; бързина и нисък риск |
| Recharts + D3 | Recharts за стандартни графики, D3 за sankey/treemap/карти |
| `@playwright/test` 1.63.0 | съвпада с предварително инсталирания Chromium в облака |

## Сигурност
- Само четене към външни източници; без потребителски акаунти във Фаза 0.
- Security headers в `next.config.ts`; CSP се добавя във Фаза 1 (след като са ясни ресурсите).
- `.env` не се commit-ва; `DATABASE_URL` само от среда.
- Външен текст (PDF/JSON/MCP) е недоверено съдържание — не се изпълнява, рендерира се екранирано.
- `/security-review` преди всяко публикуване.

## Локална среда
```bash
# облак или локално (Ubuntu)
service postgresql start
su postgres -c "psql -c \"CREATE USER budget WITH PASSWORD 'budget' CREATEDB;\" -c \"CREATE DATABASE budget2027 OWNER budget;\""
cd budget-2027 && cp .env.example .env && npm ci && npx prisma migrate deploy
npm run verify
```
Локално (не в облака): `npx playwright install chromium` и не задавай `PW_CHROMIUM_PATH`.

## Design system (Фаза 1)
Оригинален дизайн, без копиране на чужди сайтове. Токени в CSS (`:root` + тъмна тема), 4/8 px мрежа, системни шрифтове с кирилица, палитра валидирана със skill `dataviz`. Определя се след MASTER PROMPT.
