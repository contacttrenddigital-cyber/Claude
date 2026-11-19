# Внедряване

**Статус: не е внедрено.** Работи локално и в CI.

## Изисквания
- Node.js ≥ 22, PostgreSQL 16, без платени API.
- Променливи (`budget-2027/.env.example`):
  - `DATABASE_URL`: задължителна;
  - `SITE_URL`: публичният адрес (за sitemap и канонични адреси);
  - `SESSION_SECRET`: поне 32 случайни знака; без нея `/admin` е изключен;
  - `SIGMA_BASE_URL`: по избор.

## Стъпки
```bash
cd budget-2027
npm ci
npx prisma migrate deploy
npm run db:seed && npm run db:publish -- "Име на редактора"   # снимката е в git
npm run db:seed:claims
ADMIN_PASSWORD='…поне 12 знака…' npm run user:create -- --email editor@example.org --role publisher
npm run build && npm start
```

## Сигурност
- Сесийното cookie е HttpOnly, SameSite=Strict и Secure в production, с път `/admin` и валидност 8 часа.
- Паролите са със scrypt; след 5 грешни опита профилът се заключва за 15 минути.
- Ролите се проверяват на сървъра при всяко действие. Одит логът записва вход, неуспешен вход и публикуване.
- `/admin` и `/api/` са забранени в `robots.txt`.
- Предстои: CSP хедър (след като се фиксират външните ресурси), ограничение на заявките на ниво reverse proxy, резервни копия на базата и на `data/raw/`.
