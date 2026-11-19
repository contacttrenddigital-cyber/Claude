# Внедряване

**Статус: не е внедрено.** Приложението работи локално и в CI.

## Изисквания
- Node.js ≥ 22, PostgreSQL 16.
- Променливи: виж `budget-2027/.env.example` (`DATABASE_URL`, `SITE_URL`, `SIGMA_BASE_URL`). Без платени API.

## Production стъпки
```bash
cd budget-2027
npm ci
npx prisma migrate deploy
npm run db:seed && npm run db:publish -- "Име на редактора"   # снимката е в git
npm run build && npm start
```
Страниците са статични с ISR (`revalidate = 3600`). При build се чете публикуваната снимка; ако няма такава, страницата показва „няма публикувана проверена снимка“, без числа.

## Предстои
Избор на хостинг (Node сървър + управлявана PostgreSQL), CSP, мониторинг, резервни копия на базата и на `data/raw/`.
