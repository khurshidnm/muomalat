#!/bin/sh
# Create a fresh, migrated test database with the same roles and grants as dev.
#   scripts/test-db.sh <name>     e.g. scripts/test-db.sh workflow  ->  muomalat_test_workflow
# Prints the DATABASE_URL to use (app role, data-only). Development only.
set -eu
suffix="${1:?usage: scripts/test-db.sh <name>}"
case "$suffix" in *[!a-z0-9_]*) echo "name: lower-case letters, digits, _ only" >&2; exit 1;; esac
db="muomalat_test_$suffix"
pg() { docker exec -i muomalat-dev-postgres-1 psql -U muomalat_owner -v ON_ERROR_STOP=1 -q "$@"; }
pg -d postgres -c "DROP DATABASE IF EXISTS $db WITH (FORCE)" -c "CREATE DATABASE $db OWNER muomalat_owner"
pg -d "$db" <<SQL
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO muomalat_app;
ALTER DEFAULT PRIVILEGES FOR ROLE muomalat_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO muomalat_app;
ALTER DEFAULT PRIVILEGES FOR ROLE muomalat_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO muomalat_app;
REVOKE CONNECT ON DATABASE $db FROM PUBLIC;
GRANT CONNECT ON DATABASE $db TO muomalat_app;
SQL
DB_ROLE=owner DATABASE_URL_MIGRATE="postgres://muomalat_owner:dev-owner-password@127.0.0.1:5432/$db" npx payload migrate >/dev/null 2>&1 \
  || { echo "migration failed for $db" >&2; exit 1; }
echo "DATABASE_URL=postgres://muomalat_app:dev-app-password@127.0.0.1:5432/$db"
