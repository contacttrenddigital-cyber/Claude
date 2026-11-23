#!/usr/bin/env bash
# Build on Vercel: migrate the database, load and publish the snapshot committed in git, then build.
# Neon (Vercel Marketplace) provides DATABASE_URL (pooled, used at runtime) and
# DATABASE_URL_UNPOOLED (direct, used here for migrations and the one-off load).
#
# If the database cannot be reached, the site is built from the same committed snapshot instead
# (SNAPSHOT_SOURCE=file, see src/lib/data/published.ts): public pages stay correct, admin is off.
set -euo pipefail
npx prisma generate
# the snapshot the site shows in file mode (and the one published to the database otherwise)
LATEST="data/snapshots/$(node -p 'require("./data/snapshots/latest.json").file')"
cp "$LATEST" data/snapshots/published.json

DIRECT="${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}"
if [ -n "$DIRECT" ] && DATABASE_URL="$DIRECT" npx prisma migrate deploy; then
  DATABASE_URL="$DIRECT" npm run db:seed
  DATABASE_URL="$DIRECT" npm run db:publish -- "${PUBLISHED_BY:-Claude (автоматична проверка)}"
  DATABASE_URL="$DIRECT" npm run db:seed:claims
  # editor account from the project's secret environment variables (never from the repository)
  if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
    DATABASE_URL="$DIRECT" npx tsx scripts/create-user.ts --email "$ADMIN_EMAIL" --role "${ADMIN_ROLE:-publisher}"
  fi
else
  echo "⚠ Database not reachable: building from the committed snapshot $LATEST (SNAPSHOT_SOURCE=file)."
  export SNAPSHOT_SOURCE=file
fi
npx next build
