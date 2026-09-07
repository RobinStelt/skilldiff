# Production deployment — skilldiff.robin-steltmann.de

Runs on the same server as the plantwiz stack, behind that stack's shared
Caddy instance, joined via the external `plantwiz-shared` Docker network.
If you're deploying to a *different* server with no existing Caddy, see
"Standalone server" at the bottom instead — everything above that section
assumes the plantwiz-server layout described in `../CLAUDE.md`'s sibling
project notes.

## One-time setup on the server

1. **Docker must already be installed** (it is, via plantwiz's own
   `deploy.sh` — this project doesn't reinstall it).
2. **The `plantwiz-shared` network must already exist** (plantwiz's own
   `docker-compose.prod.yml` creates and uses it). `deploy.sh` checks for
   it and refuses to continue if it's missing.
3. **DNS**: point an A/AAAA record for `skilldiff.robin-steltmann.de` at
   this server's IP. Caddy issues its Let's Encrypt certificate on first
   request to that hostname — nothing to configure beyond the DNS record
   and the Caddyfile block below.

## Deploy

```bash
bash deploy.sh
```

First run clones the repo to `/opt/skilldiff`, copies `.env.prod.example`
to `.env`, and stops — fill in `.env` (see the comments in
`.env.prod.example`; three role passwords, generate each with
`openssl rand -base64 24`), then run `bash /opt/skilldiff/deploy.sh` again.
That builds and starts `postgres`, one-shot `migrate`, `marketplace-backend`,
and `marketplace-frontend` (see `../docker-compose.prod.yml` for exactly
what each does and why they're split this way — same shape as
`../docker-compose.yml`'s local dev stack, minus published host ports).

Re-running `deploy.sh` later (`git pull` + `up -d --build`) is how you
ship updates — it's idempotent.

## Caddy

The shared Caddy instance lives in the plantwiz repo, not this one — its
config isn't under version control here. Add this block to that server's
`Caddyfile` (already done in this machine's checked-out copy at
`../../vue/Caddyfile` as of this writing — copy it to the server if you
haven't yet):

```
skilldiff.robin-steltmann.de {
    handle /v1/* {
        reverse_proxy marketplace-backend:3000
    }
    handle /api/* {
        reverse_proxy marketplace-backend:3000
    }
    handle {
        reverse_proxy marketplace-frontend:80
    }
}
```

Then reload it: `docker compose -f docker-compose.prod.yml restart caddy`
(run from the plantwiz stack's directory, e.g. `/opt/plantwiz`).

`/v1/*` is the CLI's ingestion API (`skill-ab` uploads run results there —
see `../cli/README.md`); `/api/*` is the public read API the frontend
calls. Both are served by the same backend container; everything else
(`handle` with no path) falls through to the static frontend.

## After it's live

- **Point contributors' CLI at it**: `skill-ab config set endpoint
  https://skilldiff.robin-steltmann.de/v1/run-results` (see
  `../GETTING_STARTED.md`).
- **Legal pages** (`../PRIVACY.md`, `../TERMS.md`, `../IMPRESSUM.md`, and
  their frontend mirrors) have the real operator details filled in
  already — still drafts, not a substitute for real legal review; see
  each file's own draft notice before treating this as a public launch.
- **Smoke-test for real**: `curl https://skilldiff.robin-steltmann.de/api/skills`
  should return `{"skills":[],"nextCursor":null}` (or real data, once
  seeded) rather than a TLS or 502 error. `curl
  https://skilldiff.robin-steltmann.de/health` should return `{"status":"ok"}`
  — see "Monitoring" below for wiring that into Uptime Kuma.

## Backups

The `backup` service (`../docker-compose.prod.yml`, `../scripts/backup.sh`)
runs a nightly `pg_dump` of the `marktplatz` database into the
`marktplatz-backups` volume, keeping the last 7 daily + 4 weekly dumps —
same rotation scheme as the sibling plantwiz deployment's own backup
service, adapted from `mysqldump` to `pg_dump`. Verified for real (not
just read): dumped a seeded table with `backup.sh`, restored it into a
separate, fresh Postgres container with `restore.sh`, confirmed the row
came back.

```bash
# List backups
docker compose -f docker-compose.prod.yml exec backup ls -lh /backups

# Restore one (overwrites the live database!)
docker compose -f docker-compose.prod.yml exec backup \
  bash /usr/local/bin/restore.sh /backups/daily-2026-09-07_0300.sql.gz
docker compose -f docker-compose.prod.yml restart backend
```

These backups live on the same server as the database. An offsite copy
(e.g. synced to object storage) isn't set up — if the server is lost, the
backups are lost with it. Worth doing before real contributor data
accumulates, not after.

## Monitoring

`GET /health` on the backend (see `../backend/src/app.ts`) returns
`{"status":"ok"}` with no database/auth dependency — cheap enough to poll
every minute. The plantwiz stack already runs Uptime Kuma
(`https://monitor.robin-steltmann.de` — see `../../vue/OPS.md`); add a
monitor there pointed at
`https://skilldiff.robin-steltmann.de/health` with a keyword check on
`"ok"`, the same pattern plantwiz uses for its own `/api/health`. Not
done automatically here — it's a few clicks in Uptime Kuma's own UI, not
something this repo can configure for you.

## Standalone server (no existing Caddy/plantwiz-shared)

If you're deploying to a server that doesn't already run the plantwiz
stack: drop the `plantwiz-shared` network entirely — remove the
`networks:` blocks from `backend`/`frontend` in `docker-compose.prod.yml`
and the `external: true` network declaration, then publish ports directly
(`ports: ["80:80"]` on frontend, `["3000:3000"]` on backend, or put your
own Caddy/nginx in front). `../docker-compose.yml` (the local dev compose)
is the reference for what "no shared network, plain published ports"
looks like.
