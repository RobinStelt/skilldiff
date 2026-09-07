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
- **Fill in the legal-page placeholders** (`../PRIVACY.md`, `../TERMS.md`,
  and their frontend mirrors) with the real operator name/address/contact
  email before treating this as a public launch, not just a reachable
  server — see those files' own draft notices.
- **Smoke-test for real**: `curl https://skilldiff.robin-steltmann.de/api/skills`
  should return `{"skills":[],"nextCursor":null}` (or real data, once
  seeded) rather than a TLS or 502 error.

## Standalone server (no existing Caddy/plantwiz-shared)

If you're deploying to a server that doesn't already run the plantwiz
stack: drop the `plantwiz-shared` network entirely — remove the
`networks:` blocks from `backend`/`frontend` in `docker-compose.prod.yml`
and the `external: true` network declaration, then publish ports directly
(`ports: ["80:80"]` on frontend, `["3000:3000"]` on backend, or put your
own Caddy/nginx in front). `../docker-compose.yml` (the local dev compose)
is the reference for what "no shared network, plain published ports"
looks like.
