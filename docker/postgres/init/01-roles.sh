#!/bin/sh
# Runs once, when the data volume is first created. Two set-ups, picked by
# POSTGRES_USER:
#
# Development (docker/compose.dev.yml, POSTGRES_USER=muomalat_owner): the
#   owner is the image's bootstrap superuser and owns the muomalat database
#   the image made. This adds the app role (APP_DB_PASSWORD) and the
#   muomalat_test database.
#
# Production (docker/compose.prod.yml, POSTGRES_USER=postgres): postgres is
#   the bootstrap superuser, used only inside this container. This creates
#   three ordinary roles from the passwords in the environment:
#     muomalat_owner   owns the database and schema; the migrate job only
#     muomalat_app     rows only, no DDL; the app, the worker, the backup's audit row
#     muomalat_backup  read-only (pg_read_all_data); pg_dump in the backup service
#   and the database MUOMALAT_DB (default muomalat), owned by muomalat_owner.
#   02-hba.sh then limits logins to these roles from the Docker network.
#
# Grants per database: ./create-database. Passwords go through psql
# variables, so any character is safe.
set -eu
here=/docker-entrypoint-initdb.d

if [ "$POSTGRES_USER" = muomalat_owner ]; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -q -v app_pw="${APP_DB_PASSWORD:?}" <<'SQL'
CREATE ROLE muomalat_app LOGIN PASSWORD :'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE;
SQL
  "$here/create-database" --existing "$POSTGRES_DB"
  "$here/create-database" muomalat_test
  exit 0
fi

: "${OWNER_DB_PASSWORD:?set OWNER_DB_PASSWORD}"
: "${APP_DB_PASSWORD:?set APP_DB_PASSWORD}"
: "${BACKUP_DB_PASSWORD:?set BACKUP_DB_PASSWORD}"
db="${MUOMALAT_DB:-muomalat}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -q \
  -v owner_pw="$OWNER_DB_PASSWORD" -v app_pw="$APP_DB_PASSWORD" -v backup_pw="$BACKUP_DB_PASSWORD" <<'SQL'
CREATE ROLE muomalat_owner LOGIN PASSWORD :'owner_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE muomalat_app LOGIN PASSWORD :'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE muomalat_backup LOGIN PASSWORD :'backup_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT pg_read_all_data TO muomalat_backup;
-- Nobody but the roles above connects to the maintenance databases.
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
REVOKE CONNECT ON DATABASE template1 FROM PUBLIC;
SQL
"$here/create-database" "$db"
