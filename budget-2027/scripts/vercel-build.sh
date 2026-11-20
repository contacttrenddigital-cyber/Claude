#!/usr/bin/env bash
# Build on Vercel: migrate the database, load and publish the snapshot committed in git, then build.
# Neon (Vercel Marketplace) provides DATABASE_URL (pooled, used at runtime) and
# DATABASE_URL_UNPOOLED (direct, used here for migrations and the one-off load).
set -euo pipefail
DIRECT="${DATABASE_URL_UNPOOLED:-${DATABASE_URL:?DATABASE_URL is not set}}"
npx prisma generate
DATABASE_URL="$DIRECT" npx prisma migrate deploy
DATABASE_URL="$DIRECT" npm run db:seed
DATABASE_URL="$DIRECT" npm run db:publish -- "${PUBLISHED_BY:-Claude (автоматична проверка)}"
DATABASE_URL="$DIRECT" npm run db:seed:claims
npx next build
