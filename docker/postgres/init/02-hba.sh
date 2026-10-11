#!/bin/sh
# Production only (POSTGRES_USER=postgres; development keeps the image's
# defaults). Runs once, when the data volume is first created, and takes
# effect when the server starts after initialisation (CMS-SPEC §12.5):
#   - the superuser logs in only through the socket inside this container
#     (`docker compose exec postgres psql -U postgres`), never over the network;
#   - the three Muomalat roles log in with scram-sha-256 from the Docker
#     network the server is attached to (samenet), and nothing else does.
# Postgres publishes no port, so "the network" is the compose network only.
set -eu
[ "$POSTGRES_USER" = muomalat_owner ] && exit 0

cat > "$PGDATA/pg_hba.conf" <<'HBA'
# Written by docker/postgres/init/02-hba.sh. TYPE DATABASE USER ADDRESS METHOD
local   all   postgres                                           peer
local   all   all                                                scram-sha-256
host    all   postgres                                 all       reject
host    all   muomalat_owner,muomalat_app,muomalat_backup samenet scram-sha-256
host    all   all                                      all       reject
HBA
echo "02-hba.sh: pg_hba.conf limited to the Muomalat roles on the Docker network"
