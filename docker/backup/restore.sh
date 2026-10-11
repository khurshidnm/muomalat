#!/bin/sh
# Restore a backup made by muomalat-backup (CMS-SPEC §12.7). Runs in the
# `restore` service of docker/compose.prod.yml, which connects as the schema
# owner and mounts the age private key only for the duration of the run.
#
#   muomalat-restore list
#   muomalat-restore run [--backup <stamp>|latest] [--from remote|local]
#                        [--database <name>] [--media-dir <dir>]
#                        [--identity <file>] [--skip-db] [--skip-media]
#
#   --backup      a stamp such as 20261011T013000, or latest (default)
#   --from        remote: the bucket (default; needs a key that may list and read)
#                 local: this server's /backups volume
#   --database    the target database (default muomalat_restore). It must exist
#                 and be empty: make it with
#                 docker compose exec postgres /docker-entrypoint-initdb.d/create-database <name>
#   --media-dir   where the uploads are unpacked (default /restore/media; give
#                 /data/media to put them back into the live volume)
#   --identity    the age private key file (default /run/secrets/age-identity)
#
# Prints the time each step took: the restore drill records it as the RTO.
set -eu
# shellcheck disable=SC3040 # busybox ash (the Alpine image) has pipefail
set -o pipefail

log() { printf '%s restore: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >&2; }
die() { log "error: $*"; exit 1; }

: "${BACKUP_DIR:=/backups}"
: "${BACKUP_REMOTE:=}"

latest_remote() { rclone lsf --dirs-only "$BACKUP_REMOTE/daily" | sed 's#/$##' | grep '^20' | sort | tail -n 1; }
latest_local() { find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' | sed 's#.*/##' | sort | tail -n 1; }

list() {
  echo "local ($BACKUP_DIR):"
  find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' | sed 's#.*/#  #' | sort
  if [ -n "$BACKUP_REMOTE" ]; then
    for p in daily weekly monthly; do
      echo "$p ($BACKUP_REMOTE/$p):"
      rclone lsf --dirs-only "$BACKUP_REMOTE/$p" 2>/dev/null | sed 's#/$##; s#^#  #' | sort || echo "  (cannot list: the key may be write-only)"
    done
  fi
}

run() {
  backup=latest from=remote database=muomalat_restore media_dir=/restore/media
  identity=/run/secrets/age-identity skip_db=false skip_media=false
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --backup) backup=$2; shift 2 ;;
      --from) from=$2; shift 2 ;;
      --database) database=$2; shift 2 ;;
      --media-dir) media_dir=$2; shift 2 ;;
      --identity) identity=$2; shift 2 ;;
      --skip-db) skip_db=true; shift ;;
      --skip-media) skip_media=true; shift ;;
      *) die "unknown option $1" ;;
    esac
  done
  case "$database" in *[!a-z0-9_]*|'') die "--database: lower-case letters, digits and _ only" ;; esac
  [ -r "$identity" ] || die "the age private key is not readable at $identity (mount it for this run only)"
  started=$(date +%s)

  case "$from" in
    remote)
      [ -n "$BACKUP_REMOTE" ] || die "BACKUP_REMOTE is empty"
      [ "$backup" != latest ] || backup=$(latest_remote)
      [ -n "$backup" ] || die "no backup found in $BACKUP_REMOTE/daily"
      src="$BACKUP_DIR/restore-$backup"
      log "downloading $backup from $BACKUP_REMOTE/daily"
      found=false
      for p in daily weekly monthly; do
        if rclone copy "$BACKUP_REMOTE/$p/$backup" "$src" -q 2>/dev/null && [ -f "$src/SHA256SUMS" ]; then found=true; break; fi
      done
      $found || die "backup $backup not found in daily/, weekly/ or monthly/"
      ;;
    local)
      [ "$backup" != latest ] || backup=$(latest_local)
      [ -n "$backup" ] || die "no backup in $BACKUP_DIR"
      src="$BACKUP_DIR/$backup"
      [ -d "$src" ] || die "no backup $backup in $BACKUP_DIR"
      ;;
    *) die "--from must be remote or local" ;;
  esac

  (cd "$src" && sha256sum -c SHA256SUMS >/dev/null) || die "checksums of $src do not match its SHA256SUMS"
  log "backup $backup: checksums match ($(cat "$src/manifest.json" 2>/dev/null | tr -d '\n' | cut -c1-200))"
  t=$(date +%s)

  if [ "$skip_db" = false ]; then
    tables=$(psql -XAt -d "$database" -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'") \
      || die "cannot connect to database $database (create it first, see --help)"
    [ "$tables" = 0 ] || die "database $database is not empty ($tables tables); restore only into an empty database"
    log "restoring the database into $database as ${PGUSER:-?}"
    # One transaction: the database is either fully restored or left empty.
    # Objects end up owned by the connecting role, the schema owner.
    age -d -i "$identity" "$src/db.dump.age" | pg_restore --dbname="$database" --no-owner --exit-on-error --single-transaction
    log "database restored in $(( $(date +%s) - t ))s"
    t=$(date +%s)
  fi

  if [ "$skip_media" = false ]; then
    mkdir -p "$media_dir"
    [ -z "$(ls -A "$media_dir" 2>/dev/null)" ] || die "media directory $media_dir is not empty"
    log "unpacking the uploads into $media_dir"
    # The archive holds one top-level folder (media/); unpack its contents.
    age -d -i "$identity" "$src/media.tar.age" | tar -C "$media_dir" -xf - --strip-components=1
    log "media restored in $(( $(date +%s) - t ))s: $(find "$media_dir" -type f | wc -l | tr -d ' ') file(s)"
  fi

  case "$src" in "$BACKUP_DIR"/restore-*) rm -rf "$src" ;; esac
  log "restore of $backup finished in $(( $(date +%s) - started ))s (RTO of this drill)"
}

cmd="${1:-help}"
[ "$#" -gt 0 ] && shift
case "$cmd" in
  list) list ;;
  run) run "$@" ;;
  *) sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//' >&2; [ "$cmd" = help ] || [ "$cmd" = --help ] ;;
esac
