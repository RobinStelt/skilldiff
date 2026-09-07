# SkillDiff

Shows whether a Claude skill actually helps — measured from real usage
(a task run once with the skill loaded, once without), not stars or a
security scan. Full rationale: [`skill-ab-marktplatz-plan.md`](skill-ab-marktplatz-plan.md)
(German — the project's own planning language, see [`CLAUDE.md`](CLAUDE.md)).

## Just want to try the CLI?

→ [`GETTING_STARTED.md`](GETTING_STARTED.md) — `npm install -g skill-ab`
(or build from source), run a comparison, optionally contribute it.

## Structure

| Package | What it is |
|---|---|
| [`schema/`](schema/README.md) | Contract layer — Zod schema + TS types + validation, shared by every other package |
| [`cli/`](cli/README.md) | `skill-ab` — runs a task with/without a skill, measures automatically, uploads the pair |
| [`backend/`](backend/README.md) | Ingestion, aggregation, reputation weighting, anomaly flagging, admin/skill-catalog API |
| [`frontend/`](frontend/README.md) | Public marketplace view + admin UI |

## Running everything locally

```bash
docker compose up --build
```

Brings up Postgres, applies migrations, and starts the backend
(`http://localhost:3000`) and frontend (`http://localhost:8081`) — see
[`docker-compose.yml`](docker-compose.yml) for exactly what each service
does. Verified end to end: all three images build, `docker compose up`
brings up all four containers in the right order, the frontend (served by
nginx from the built static files) actually loads and talks to the
backend, and admin login works against the Dockerized Postgres.

**If the build fails inside `npm install`** (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`,
or `tsc`/`vite` missing right after an `Exit handler never called!`
message): something on your machine is intercepting HTTPS — a corporate
proxy or an antivirus's web shield (hit this for real; see
[`docker/README.md`](docker/README.md) for the one-file fix).

**Creating the first admin login** (or running any other one-off script —
`mark-seed-account.ts`, `refresh-github-stars.ts`) isn't part of `up`,
since it needs a choice only you can make (the credentials), and the
production backend image doesn't include `backend/scripts/` at all
(only `package.json`, `node_modules`, `dist`, and `db` are copied into
its final stage — see `backend/Dockerfile`). Run it from a local
`backend/` checkout instead, pointed at the Dockerized Postgres. Only
`APP_DATABASE_URL` is needed — `create-admin.ts` never touches the
content-writer connection:

```bash
cd backend && npm install
APP_DATABASE_URL=postgres://app_backend:change-me-app-backend@localhost:5432/skilldiff \
  npx tsx scripts/create-admin.ts <username> <password>
```

For active backend/frontend development (fast rebuilds, no image
rebuilding per change), use each package's own `npm run dev` instead —
`backend/README.md` and `frontend/README.md`.

## License

[MIT](LICENSE).

## Legal (site)

[`PRIVACY.md`](PRIVACY.md), [`TERMS.md`](TERMS.md),
[`IMPRESSUM.md`](IMPRESSUM.md) — drafts, not a substitute for real legal
review; see the notice at the top of each.
