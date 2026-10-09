#!/bin/sh
# Runs once, when the data volume is first created.
# The app role can read and write rows but cannot change the schema; tables the
# owner creates later (migrations) are granted to it automatically.
set -eu
setup_db() {
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$1" <<SQL
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO muomalat_app;
ALTER DEFAULT PRIVILEGES FOR ROLE muomalat_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO muomalat_app;
ALTER DEFAULT PRIVILEGES FOR ROLE muomalat_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO muomalat_app;
SQL
}
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE muomalat_app LOGIN PASSWORD '${APP_DB_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE muomalat_test OWNER muomalat_owner;
REVOKE CONNECT ON DATABASE muomalat FROM PUBLIC;
GRANT CONNECT ON DATABASE muomalat TO muomalat_app;
SQL
setup_db "$POSTGRES_DB"
setup_db muomalat_test
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "REVOKE CONNECT ON DATABASE muomalat_test FROM PUBLIC; GRANT CONNECT ON DATABASE muomalat_test TO muomalat_app;"
