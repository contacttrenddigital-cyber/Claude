# Бюджет 2027 — под лупа

Независима платформа за анализ на бюджета на България за 2027 г. Всяко число на сайта сочи към официален документ, таблица, ред и колона, със SHA-256 на оригиналния файл.

## Стартиране с една команда

Изисквания: **Node.js ≥ 22**, **PostgreSQL 16** (локално на порт 5432), Python 3 само ако ще извличаш документите наново.

```bash
cd budget-2027 && cp -n .env.example .env && npm ci && npx prisma migrate deploy && npm run db:seed && npm run db:publish -- "Локален преглед" && npm run db:seed:claims && npm run build && npm start
```

Отвори http://localhost:3000. Снимката на данните е в git (`data/snapshots/`), затова стартирането не изисква мрежа.

Ако PostgreSQL още няма потребител и база:
```bash
sudo -u postgres psql -c "CREATE USER budget WITH PASSWORD 'budget' CREATEDB;" -c "CREATE DATABASE budget2027 OWNER budget;"
```

## Команди
| Команда | Какво прави |
|---|---|
| `npm run dev` | dev сървър |
| `npm run verify` | lint + typecheck + проверка на skills + unit тестове |
| `npm run test:coverage` | unit тестове с праг 90% |
| `npm run test:live` | договорни тестове срещу реалната СИГМА |
| `npm run test:e2e` | Playwright: desktop + mobile, axe (в облака: `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`) |
| `npm run sources:fetch` | сваля отново първичните документи и сверява SHA-256 |
| `npm run extract` | извлича таблиците и Приложение № 3 от DOCX |
| `npm run snapshot:build` | сглобява проверена снимка (спира при неуспешна проверка) |
| `npm run db:seed` / `db:publish -- "Име"` | зарежда / публикува снимка (с одит лог) |
| `npm run db:seed:claims` | зарежда проверките на твърдения (`data/claims/`) |
| `ADMIN_PASSWORD=… npm run user:create -- --email … --role publisher` | създава редактор за `/admin` (нужен е `SESSION_SECRET` в `.env`) |
| `npm run docs:dictionary` | генерира `docs/FISCAL_DATA_DICTIONARY.md` |

## Документация
`../CLAUDE.md`, `../TASKS.md`, `../docs/` — архитектура, източници, методология, речник, версии, дизайн система, ограничения.
