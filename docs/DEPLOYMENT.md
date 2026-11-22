# Внедряване

**Статус: подготвено за Vercel + Neon** (`budget-2027/vercel.json`, `scripts/vercel-build.sh`). Внедряването се прави от собственика на профилите.

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

## Vercel + Neon (препоръчано)
1. vercel.com → Sign up with GitHub → **Add New… → Project** → избери хранилището `Claude` → **Import**.
2. **Root Directory**: `budget-2027`. Framework: Next.js (разпознава се сам). Build Command идва от `vercel.json`.
3. Преди Deploy: **Storage → Create Database → Neon** (регион Frankfurt, `aws-eu-central-1`). Свържи я с проекта: добавя `DATABASE_URL` и `DATABASE_URL_UNPOOLED`.
4. **Settings → Environment Variables**:
   - `SESSION_SECRET`: случаен низ от поне 32 знака (за `/admin`);
   - `SITE_URL`: по избор, ако имаш собствен домейн.
5. **Settings → Git → Production Branch**: `claude/budget-2027-setup-3y1lne` (докато клонът не е слят с основния).
6. **Deployments → Redeploy**. При изграждането `vercel-build.sh`:
   - прилага миграциите;
   - зарежда снимката от git и я публикува само ако още не е публикувана;
   - зарежда проверките на твърденията;
   - изгражда сайта.
7. Редактор за `/admin` (по избор): от компютър с `DATABASE_URL_UNPOOLED` в `.env` пусни `ADMIN_PASSWORD='…' npm run user:create -- --email … --role publisher`.

Регионът на функциите е `fra1` (Франкфурт), близо до базата.

## Резервен режим без база (SNAPSHOT_SOURCE=file)
`scripts/vercel-build.sh` копира публикуваната снимка (`data/snapshots/latest.json` → файла ѝ) в `data/snapshots/published.json`.
Ако базата (Neon) не отговаря при изграждането, сайтът се изгражда от този файл: същите данни, същите проверки на произхода
(`assertPublishable`), админ панелът е изключен. Стойността се вгражда при изграждането (`next.config.ts`, `env`), така че и
обновяванията по време на работа четат файла. Проверено: 230 публични e2e теста минават в този режим.
Когато базата отново е достъпна, следващото изграждане минава по обичайния път (миграции → зареждане → публикуване).
