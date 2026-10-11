# Production image (CMS-SPEC §12.5, §15). One image runs the app, the worker
# and the one-shot jobs (docker/runtime/muomalat); the `backup` target adds
# pg_dump, age and rclone on top of it for the backup service.
#
#   docker build -f docker/Dockerfile -t muomalat:local .                   # app, worker, migrate (the last stage)
#   docker build -f docker/Dockerfile --target backup -t muomalat-backup:local .
#
# Built in CI (.github/workflows/ci.yml) and deployed by digest; never built
# on the VPS. The image holds no secrets of ours: every setting comes from the
# environment at run time. It does hold the keys Next generates per build
# (draft-mode cookie and server-action encryption), so keep the registry
# package private (docs/DEPLOY.md).

# Node 24 LTS on Alpine, pinned by digest (multi-arch index). Renovate bumps it;
# rebuild at least monthly for the Alpine security fixes (§12.5).
ARG NODE_IMAGE=node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

# ── Dependencies: npm ci from the committed lockfile (§12.1) ────────────────
FROM ${NODE_IMAGE} AS deps
WORKDIR /src
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ── Build: next build, then the worker and job bundles ──────────────────────
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    # No database at build time: the build renders the mock data, and
    # docker/runtime/build.mjs removes every page it prerendered, so the CMS
    # content is rendered at run time. Production runs CONTENT_SOURCE=payload.
    CONTENT_SOURCE=mock
# Inlined into the browser bundles at build time; the canonical origin.
ARG NEXT_PUBLIC_SITE_URL=https://muomalat.uz
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
# Only what `next build` reads, so a change to docker/ or the docs does not
# rebuild the site.
COPY next.config.ts tsconfig.json postcss.config.mjs ./
COPY public ./public
COPY src ./src
RUN npx next build
# The worker, the one-shot jobs and their packages (docker/runtime/build.mjs).
COPY scripts ./scripts
COPY docker/runtime ./docker/runtime
RUN node docker/runtime/build.mjs \
 && cp -R public .next/standalone/public \
 && mkdir -p .next/standalone/.next .next/standalone/src/assets .next/standalone/docker/runtime \
 && cp -R .next/static .next/standalone/.next/static \
 # OG cards read their fonts from <cwd>/src/assets/fonts (src/lib/og/card.tsx).
 && cp -R src/assets/fonts .next/standalone/src/assets/fonts \
 && cp docker/runtime/heartbeat.mjs docker/runtime/healthcheck.mjs .next/standalone/docker/runtime/ \
 && rm -f .next/standalone/.env .next/standalone/.env.*

# ── Runtime: app, worker, migrate ───────────────────────────────────────────
FROM ${NODE_IMAGE} AS runtime
# The fixed non-root user of §12.5. npm, npx and yarn are not needed to run
# and are removed with their dependency trees.
RUN addgroup -S -g 1001 muomalat \
 && adduser -S -D -H -u 1001 -G muomalat -h /app -s /sbin/nologin muomalat \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_DIR=/data/media \
    CONTENT_SOURCE=payload
# Code is owned by root and read-only to the app user, even without
# read_only: true. The only writable paths are volumes or tmpfs in compose:
#   /app/.next/cache                Next data cache (unstable_cache) and image cache: volume next-cache
#   /app/.next/server/route-cache   pages rendered at run time: volume route-cache, emptied by
#                                   `muomalat app` when the image changes (they name its JS files)
#   /data/media                     Payload uploads: volume media
#   /tmp                            tmpfs
COPY --from=build /src/.next/standalone/ ./
COPY docker/runtime/muomalat /usr/local/bin/muomalat
RUN chmod 0755 /usr/local/bin/muomalat \
 && install -d -o 1001 -g 1001 -m 0750 /app/.next/cache /app/.next/server/route-cache /data/media
USER 1001:1001
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/muomalat"]
CMD ["app"]

# ── Backup: the runtime plus pg_dump, age and rclone (docker/backup) ────────
FROM runtime AS backup
USER root
# Alpine 3.24 packages, held to the minor version (the base image digest
# fixes the branch; revisions bring security fixes).
RUN apk add --no-cache 'postgresql17-client~17' 'age~1.3' 'rclone~1.74' tzdata \
 && install -d -o 1001 -g 1001 -m 0750 /backups /restore
COPY docker/backup/backup.sh /usr/local/bin/muomalat-backup
COPY docker/backup/restore.sh /usr/local/bin/muomalat-restore
COPY docker/backup/compare.sh /usr/local/bin/muomalat-compare
RUN chmod 0755 /usr/local/bin/muomalat-backup /usr/local/bin/muomalat-restore /usr/local/bin/muomalat-compare
USER 1001:1001
ENTRYPOINT ["/usr/local/bin/muomalat-backup"]
CMD ["schedule"]

# ── Default target: the runtime image (a plain `docker build` builds this) ──
FROM runtime AS app
