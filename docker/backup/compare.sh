#!/bin/sh
# Proof for the restore drill (CMS-SPEC §12.7): compares two databases table
# by table, and optionally two media folders file by file.
#
#   muomalat-compare [--except <table,table…>] <database-a> <database-b> [<media-dir-a> <media-dir-b>]
#
# For every table in the public schema of database A it prints the row count
# and an MD5 over the sorted MD5s of the rows' text form, for both databases,
# and fails on any difference (a table missing on one side included). Run it
# as a role that can read both, such as the schema owner in the `restore`
# service. Exit 0 only when everything matches.
#
# Against the live database, leave out the tables that change all the time
# (rows written after the backup ran), e.g.
#   --except audit_log,publish_events,payload_kv,users_sessions
set -eu
# shellcheck disable=SC3040 # busybox ash (the Alpine image) has pipefail
set -o pipefail

except=""
if [ "${1:-}" = --except ]; then except=",${2:?--except needs a list},"; shift 2; fi
[ "$#" -eq 2 ] || [ "$#" -eq 4 ] || { sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }
a=$1 b=$2
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

tables() {
  psql -XAt -d "$1" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1" |
    while read -r t; do case "$except" in *",$t,"*) ;; *) echo "$t" ;; esac; done
}
digest() {
  db=$1
  query=""
  for t in $(cat "$tmp/tables"); do
    part="SELECT '$t' AS t, (SELECT count(*) FROM public.\"$t\") AS n, (SELECT coalesce(md5(string_agg(md5(r::text), ',' ORDER BY md5(r::text))), '-') FROM public.\"$t\" r) AS h"
    query="${query:+$query UNION ALL }$part"
  done
  # The same session settings on both sides, so dates and numbers print alike.
  PGOPTIONS='-c TimeZone=UTC -c DateStyle=ISO -c extra_float_digits=3' psql -XAt -F ' ' -d "$db" -c "$query ORDER BY 1"
}

tables "$a" > "$tmp/tables"
tables "$b" > "$tmp/tables-b"
status=0
if ! diff -q "$tmp/tables" "$tmp/tables-b" >/dev/null; then
  echo "tables differ:"
  diff "$tmp/tables" "$tmp/tables-b" || true
  status=1
fi
digest "$a" > "$tmp/a"
digest "$b" > "$tmp/b" 2>"$tmp/b.err" || { echo "database $b: $(cat "$tmp/b.err")"; status=1; }
count=$(wc -l < "$tmp/tables" | tr -d ' ')
rows=$(awk '{ n += $2 } END { print n + 0 }' "$tmp/a")
if diff "$tmp/a" "$tmp/b" > "$tmp/diff"; then
  echo "database: $count tables, $rows rows, identical in $a and $b${except:+ (left out: $(echo "$except" | sed "s/^,//; s/,$//"))}"
else
  echo "database: differences between $a (<) and $b (>):"
  cat "$tmp/diff"
  status=1
fi

if [ "$#" -eq 4 ]; then
  (cd "$3" && find . -type f -exec sha256sum {} + | sort -k 2) > "$tmp/ma"
  (cd "$4" && find . -type f -exec sha256sum {} + | sort -k 2) > "$tmp/mb"
  files=$(wc -l < "$tmp/ma" | tr -d ' ')
  if diff "$tmp/ma" "$tmp/mb" > "$tmp/mdiff"; then
    echo "media: $files files, identical in $3 and $4"
  else
    echo "media: differences between $3 (<) and $4 (>):"
    cat "$tmp/mdiff"
    status=1
  fi
fi
exit "$status"
