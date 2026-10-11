#!/bin/sh
# Encrypted backups of the database and the uploads (CMS-SPEC §12.7). The
# entry point of the `backup` service (docker/compose.prod.yml):
#
#   muomalat-backup schedule   every day at BACKUP_AT (Tashkent time), run once; the default
#   muomalat-backup run        one backup now (before a release, or to test)
#   muomalat-backup list       backups in the bucket (needs a key that may list)
#   muomalat-backup status     the result of the last run in this container's volume
#
# One run:
#   1. pg_dump -Fc as the read-only backup role, piped straight into age:
#      no unencrypted copy is ever written;
#   2. tar of the media volume, piped into age the same way;
#   3. a manifest with SHA-256 sums (the only plaintext file);
#   4. upload with rclone to <BACKUP_REMOTE>/daily/<stamp>/, and also to
#      weekly/ on Sundays and monthly/ on the 1st. The bucket deletes old
#      copies by prefix (lifecycle rules: 30 daily, 12 weekly, 12 monthly) and
#      keeps each object locked for 30 days, so the key on this server only
#      needs to write (docs/DEPLOY.md);
#   5. keeps the last BACKUP_KEEP_LOCAL days in /backups for quick restores;
#   6. writes ops.backup_ok or ops.backup_fail to the audit log; the worker
#      alerts when no ops.backup_ok has arrived by 06:00.
#
# Decrypting needs the age private key, which is kept offline, never on the
# server (restore: muomalat-restore).
set -eu
# shellcheck disable=SC3040 # busybox ash (the Alpine image) has pipefail
set -o pipefail

: "${BACKUP_AT:=01:30}"
: "${BACKUP_DIR:=/backups}"
: "${BACKUP_MEDIA_DIR:=/data/media}"
: "${BACKUP_KEEP_LOCAL:=3}"
: "${BACKUP_REMOTE:=}"
: "${BACKUP_PRUNE:=false}"
: "${PGDATABASE:=muomalat}"
export PGDATABASE

log() { printf '%s backup: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >&2; }
die() { log "error: $*"; exit 1; }
size() { du -k "$1" | awk '{ printf "%.1f MB", $1 / 1024 }'; }

recipients() {
  # BACKUP_AGE_RECIPIENTS: one or more public keys (age1…), space separated.
  # Two are recommended: the founder's key and a second key kept in the safe.
  [ -n "${BACKUP_AGE_RECIPIENTS:-}" ] || die "BACKUP_AGE_RECIPIENTS is empty: set the age public key(s)"
  file="$BACKUP_DIR/.recipients"
  : > "$file"
  for key in $BACKUP_AGE_RECIPIENTS; do
    case "$key" in age1*) echo "$key" >> "$file" ;; *) die "BACKUP_AGE_RECIPIENTS: not an age public key: $key" ;; esac
  done
  echo "$file"
}

upload() {
  # Write-only keys: only PutObject. No HEAD of the destination folder
  # (--s3-no-head-object), of the uploaded file (--s3-no-head) or of the
  # bucket (--s3-no-check-bucket), and no listing (--no-check-dest).
  rclone copy "$1" "$2" --no-check-dest --s3-no-check-bucket --s3-no-head --s3-no-head-object \
    --retries 5 --low-level-retries 10 --stats-one-line --stats 0 -q
}

status() {
  printf '%s %s %s\n' "$1" "$(date +%s)" "$2" > "$BACKUP_DIR/.status"
}

run() {
  started=$(date +%s)
  stamp=$(date +%Y%m%dT%H%M%S)
  dir="$BACKUP_DIR/$stamp"
  step=prepare
  trap 'failed' EXIT
  mkdir -p "$dir"
  rcpt=$(recipients)
  log "run $stamp started (database $PGDATABASE on ${PGHOST:-?} as ${PGUSER:-?})"

  step=database
  pg_dump --format=custom --compress=6 --no-password | age -R "$rcpt" -o "$dir/db.dump.age"
  log "database: $(size "$dir/db.dump.age") encrypted"

  step=media
  if [ -d "$BACKUP_MEDIA_DIR" ]; then
    tar -C "$(dirname "$BACKUP_MEDIA_DIR")" -cf - "$(basename "$BACKUP_MEDIA_DIR")" | age -R "$rcpt" -o "$dir/media.tar.age"
    files=$(find "$BACKUP_MEDIA_DIR" -type f | wc -l | tr -d ' ')
    log "media: $files file(s), $(size "$dir/media.tar.age") encrypted"
  else
    die "media directory $BACKUP_MEDIA_DIR is missing"
  fi

  step=manifest
  (cd "$dir" && sha256sum db.dump.age media.tar.age > SHA256SUMS)
  server=$(psql -XAtc 'SHOW server_version' 2>/dev/null || echo unknown)
  cat > "$dir/manifest.json" <<JSON
{"stamp":"$stamp","created":"$(date -Iseconds)","database":"$PGDATABASE","server_version":"$server","pg_dump":"$(pg_dump --version | awk '{print $NF}')","media_files":$files,"site_env":"${SITE_ENV:-}","format":"pg_dump custom + tar, each encrypted with age"}
JSON

  step=upload
  if [ -n "$BACKUP_REMOTE" ]; then
    upload "$dir" "$BACKUP_REMOTE/daily/$stamp"
    where="$BACKUP_REMOTE/daily/$stamp"
    if [ "$(date +%u)" = 7 ]; then upload "$dir" "$BACKUP_REMOTE/weekly/$stamp"; where="$where +weekly"; fi
    if [ "$(date +%d)" = 01 ]; then upload "$dir" "$BACKUP_REMOTE/monthly/$stamp"; where="$where +monthly"; fi
    log "uploaded to $where"
  else
    where="$dir (local only: BACKUP_REMOTE is empty)"
    log "warning: BACKUP_REMOTE is empty; the backup stays on this server only"
  fi

  step=prune
  find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime +"$BACKUP_KEEP_LOCAL" -exec rm -rf {} +
  if [ "$BACKUP_PRUNE" = true ] && [ -n "$BACKUP_REMOTE" ]; then
    # Only for buckets without lifecycle rules; the key must then list and delete.
    rclone delete "$BACKUP_REMOTE/daily" --min-age 31d -q || log "warning: prune daily failed"
    rclone delete "$BACKUP_REMOTE/weekly" --min-age 85d -q || log "warning: prune weekly failed"
    rclone delete "$BACKUP_REMOTE/monthly" --min-age 366d -q || log "warning: prune monthly failed"
  fi

  step=audit
  took=$(( $(date +%s) - started ))
  summary="db $(size "$dir/db.dump.age"), media $(size "$dir/media.tar.age") ($files files), ${took}s, $where"
  trap - EXIT
  status ok "$stamp"
  log "done in ${took}s"
  muomalat record-backup ok "$summary" || { log "error: the audit row could not be written"; status fail "$stamp audit"; return 1; }
}

failed() {
  code=$?
  trap - EXIT
  log "run failed at step '$step' (exit $code)"
  status fail "${stamp:-?} $step"
  muomalat record-backup fail "Zaxira nusxa olinmadi: '$step' bosqichida xato (kod $code)" || log "error: the audit row could not be written either"
  exit "$code"
}

schedule() {
  # Runs in the container's time zone (TZ=Asia/Tashkent; no daylight saving).
  case "$BACKUP_AT" in [0-2][0-9]:[0-5][0-9]) ;; *) die "BACKUP_AT must be HH:MM, got '$BACKUP_AT'" ;; esac
  trap 'log "stopping"; exit 0' TERM INT
  log "scheduler: every day at $BACKUP_AT ($(date +%Z)); remote ${BACKUP_REMOTE:-none}"
  while :; do
    now=$(date +%s)
    next=$(date -d "$(date +%Y-%m-%d) $BACKUP_AT" +%s)
    [ "$next" -gt "$now" ] || next=$((next + 86400))
    log "next run at $(date -d "@$next" '+%Y-%m-%d %H:%M')"
    sleep $((next - now)) &
    wait $! || true
    # A failed run is logged and alerted; the scheduler carries on.
    (run) || true
  done
}

cmd="${1:-schedule}"
[ "$#" -gt 0 ] && shift
case "$cmd" in
  schedule) schedule ;;
  run) run ;;
  list)
    [ -n "$BACKUP_REMOTE" ] || die "BACKUP_REMOTE is empty"
    for p in daily weekly monthly; do echo "$p:"; rclone lsf --dirs-only "$BACKUP_REMOTE/$p" 2>/dev/null | sed 's/^/  /' || echo "  (cannot list: the key may be write-only)"; done ;;
  status)
    [ -f "$BACKUP_DIR/.status" ] || { echo "no run yet"; exit 1; }
    read -r result at what < "$BACKUP_DIR/.status"
    echo "last run: $result at $(date -d "@$at" '+%Y-%m-%d %H:%M') ($what)"
    [ "$result" = ok ] ;;
  healthcheck)
    # Unhealthy only after a failed run; before the first run it is healthy.
    [ ! -f "$BACKUP_DIR/.status" ] || [ "$(cut -d' ' -f1 "$BACKUP_DIR/.status")" = ok ] ;;
  restore) exec muomalat-restore "$@" ;;
  compare) exec muomalat-compare "$@" ;;
  *) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2 ;;
esac
