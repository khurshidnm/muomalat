#!/bin/sh
# Smoke tests after every deploy (CMS-SPEC §16, group K): the checks curl can
# make from outside. Run from your laptop (or the VPS) after `mctl up -d`:
#
#   docker/smoke.sh https://muomalat.uz https://cms.muomalat.uz
#
# Local rehearsal (docker/compose.prodtest.yml; no Cloudflare, no Access):
#
#   docker/smoke.sh http://muomalat.uz http://cms.muomalat.uz --connect 127.0.0.1:3110
#
# Prints PASS or FAIL per check and exits 1 if any failed. The browser checks
# of the list (cookies, idle logout, security-key-only login, lock-out drill)
# are in docs/DEPLOY.md, "Smoke tests".
# shellcheck disable=SC2046 # `set -- $(req …)` splits the status and the headers file on purpose
set -u
site=${1:?usage: smoke.sh <site-url> <cms-url> [--connect host:port]}
cms=${2:?usage: smoke.sh <site-url> <cms-url> [--connect host:port]}
connect=""
[ "${3:-}" = --connect ] && connect=${4:?--connect needs host:port}
failed=0

req() { # req <method> <url> [curl args…] → prints "status<TAB>headers-file"
  method=$1 url=$2; shift 2
  hdr=$(mktemp)
  if [ -n "$connect" ]; then
    code=$(curl -s -o /dev/null -D "$hdr" -X "$method" --max-time 20 --connect-to "::$connect" -w '%{http_code}' "$@" "$url")
  else
    code=$(curl -s -o /dev/null -D "$hdr" -X "$method" --max-time 20 -w '%{http_code}' "$@" "$url")
  fi
  printf '%s\t%s\n' "$code" "$hdr"
}
check() { # check <label> <ok?>
  if [ "$2" = yes ]; then echo "PASS  $1"; else echo "FAIL  $1"; failed=1; fi
}
status_in() { # status_in <status> <list…>
  s=$1; shift
  for x in "$@"; do [ "$s" = "$x" ] && { echo yes; return; }; done
  echo no
}
blocked() { # Cloudflare WAF answers 403; the app answers 404; Access redirects (302) to its login.
  if [ -n "$connect" ]; then status_in "$1" 404; else status_in "$1" 403 404; fi
}
has_header() { grep -qi "^$1:" "$2" && echo yes || echo no; }

# K5: security headers on the public site
set -- $(req GET "$site/" | tr '\t' ' ')
check "site / answers 200 (got $1)" "$(status_in "$1" 200)"
for h in strict-transport-security content-security-policy x-content-type-options referrer-policy permissions-policy; do
  check "site / sends $h" "$(has_header "$h" "$2")"
done
check "site / CSP forbids framing" "$(grep -qi "^content-security-policy:.*frame-ancestors 'none'" "$2" && echo yes || echo no)"
rm -f "$2"

for path in /kr /ru /en /rss.xml /sitemap.xml /robots.txt; do
  set -- $(req GET "$site$path" | tr '\t' ' '); rm -f "$2"
  check "site $path answers 200 (got $1)" "$(status_in "$1" 200)"
done
set -- $(req GET "$site/sahifa-yoq-$(date +%s)" | tr '\t' ' '); rm -f "$2"
check "site unknown page is 404 (got $1)" "$(status_in "$1" 404)"

# §2.3 and K3: the CMS is not on the public host; first-user and internal paths are closed everywhere
for path in /admin /admin/login /api/users /api/users/me /api/articles /api/graphql /preview /exit-preview /internal/revalidate; do
  set -- $(req GET "$site$path" | tr '\t' ' '); rm -f "$2"
  check "site $path is blocked (got $1)" "$(blocked "$1")"
done
set -- $(req POST "$site/internal/revalidate" -H 'content-type: application/json' --data '{}' | tr '\t' ' '); rm -f "$2"
check "site POST /internal/revalidate is blocked (got $1)" "$(blocked "$1")"
set -- $(req POST "$site/api/users/login" -H 'content-type: application/json' --data '{"email":"x@example.com","password":"x"}' | tr '\t' ' '); rm -f "$2"
check "site POST /api/users/login is blocked (got $1)" "$(blocked "$1")"
for path in /api/users/first-register /admin/create-first-user /api/graphql /internal/revalidate; do
  set -- $(req GET "$cms$path" | tr '\t' ' '); rm -f "$2"
  if [ -n "$connect" ]; then ok=$(status_in "$1" 404); else ok=$(status_in "$1" 302 403 404); fi
  check "cms $path is closed (got $1)" "$ok"
done

if [ -n "$connect" ]; then
  # Without Cloudflare Access in front, the CMS host answers itself.
  set -- $(req GET "$cms/admin/login" | tr '\t' ' ')
  check "cms /admin/login answers 200 (got $1)" "$(status_in "$1" 200)"
  check "cms sends X-Robots-Tag noindex (K5)" "$(grep -qi '^x-robots-tag:.*noindex' "$2" && echo yes || echo no)"
  check "cms /admin is not cached (no-store)" "$(grep -qi '^cache-control:.*no-store' "$2" && echo yes || echo no)"
  rm -f "$2"
  set -- $(req GET "$cms/robots.txt" | tr '\t' ' '); rm -f "$2"
  check "cms /robots.txt answers 200 (got $1)" "$(status_in "$1" 200)"
else
  # §12.3: Cloudflare Access stands in front of everything on the CMS host.
  for path in / /admin /api/users/me; do
    set -- $(req GET "$cms$path" | tr '\t' ' ')
    loc=$(grep -i '^location:' "$2" | tr -d '\r' | cut -d' ' -f2-); rm -f "$2"
    check "cms $path sends you to Cloudflare Access (got $1 → ${loc:-none})" "$(case "$1:$loc" in 302:*cloudflareaccess.com*|403:*) echo yes ;; *) echo no ;; esac)"
  done
fi

[ "$failed" = 0 ] && echo "All checks passed." || echo "Some checks FAILED: read the lines marked FAIL."
exit "$failed"
