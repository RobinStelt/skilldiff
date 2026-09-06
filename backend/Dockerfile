# Build context MUST be the repo root (docker-compose.yml sets this) —
# backend depends on ../schema via "file:../schema" in package.json, so
# both directories need to exist side by side inside the build, exactly
# like they do in the repo.
FROM node:20-alpine AS build
WORKDIR /repo
# Docker Desktop on Windows/Mac relays ALL container network traffic
# through the host's own TCP/IP stack (docker info shows this as an
# "HTTP(S) Proxy: http.docker.internal:..." — not a configurable proxy
# setting, core to how its networking works). If anything on the host
# inspects HTTPS (an antivirus's web shield, a corporate proxy) it
# re-signs traffic with its own certificate — trusted by the host's own
# Node/npm (reproduced: the host trusted it via NODE_EXTRA_CA_CERTS) but
# NOT by a Linux container's separate CA bundle, so `npm install`'s
# registry fetches fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE. Reproduced
# for real against a real antivirus's HTTPS scanner — this isn't
# theoretical.
#
# Fix (opt-in, no-op for everyone not behind such a proxy): drop that
# certificate at docker/extra-ca.crt (gitignored — never commit an
# org/AV-specific cert) before building. The bracket glob below matches
# zero-or-one files, so COPY doesn't fail when the file is absent; the
# `touch` guarantees NODE_EXTRA_CA_CERTS always points at a real (possibly
# empty, i.e. a no-op) file instead of erroring on a missing one. Plain
# NODE_EXTRA_CA_CERTS instead of `apk add ca-certificates && update-ca-
# certificates`: that apk fetch is itself an HTTPS request, so on exactly
# the network this is meant to fix, apk fails the same way npm does —
# reproduced.
RUN mkdir -p /extra-ca && touch /extra-ca/extra-ca.crt
COPY docker/extra-ca.cr[t] /extra-ca/
ENV NODE_EXTRA_CA_CERTS=/extra-ca/extra-ca.crt
# --no-audit/--no-fund: npm's automatic post-install audit call is itself
# an extra network request, no reason to make one during a Docker build.
COPY schema ./schema
COPY backend ./backend
# The retry (fresh node_modules each attempt, verified via a real file
# check, not just npm's exit code) is defense-in-depth for ordinary
# network flakiness — the CA step above is what actually fixes the
# TLS-interception case, not this loop by itself.
RUN for i in 1 2 3; do \
      rm -rf schema/node_modules; \
      npm --prefix schema install --no-audit --no-fund && test -f schema/node_modules/.bin/tsc && break; \
      echo "schema npm install attempt $i failed, retrying..."; sleep 5; \
    done && npm --prefix schema run build
RUN for i in 1 2 3; do \
      rm -rf backend/node_modules; \
      npm --prefix backend install --no-audit --no-fund && test -f backend/node_modules/.bin/tsc && break; \
      echo "backend npm install attempt $i failed, retrying..."; sleep 5; \
    done && npm --prefix backend run build

# Final stage mirrors the same repo-relative layout (schema/ next to
# backend/) so backend/node_modules/@marktplatz/schema — an npm-managed
# symlink to ../../schema, not a copy — still resolves correctly. Not
# pruning schema's node_modules separately: it's tiny (only zod).
FROM node:20-alpine
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/schema/package.json ./schema/package.json
COPY --from=build /repo/schema/dist ./schema/dist
COPY --from=build /repo/schema/node_modules ./schema/node_modules
COPY --from=build /repo/backend/package.json ./backend/package.json
COPY --from=build /repo/backend/node_modules ./backend/node_modules
COPY --from=build /repo/backend/dist ./backend/dist
COPY --from=build /repo/backend/db ./backend/db
WORKDIR /repo/backend
EXPOSE 3000
CMD ["node", "dist/server.js"]
