# frontend — public marketplace view (Phase 4)

Implements `05-marktplatz-phase4-frontend.md`. Full context:
`../skill-ab-marktplatz-plan.md`, sections 5 (evaluation dimensions) and 7
(residual risks, especially the trust-through-transparency principle).

## Status: wired to the real backend

Originally built against a documented contract (`src/api/types.ts`) while
the backend's HTTP layer didn't exist yet — see git history for that phase.
The backend (`../backend`) now serves that exact contract under `/api/*`
(`backend/src/api/publicApi.ts`, `backend/src/app.ts`), verified end-to-end
against a real Postgres + real HTTP requests through the browser, including
the seed-data badge, isolation-tier breakdown, account-diversity note, and
per-category export link.

`src/main.tsx` uses `createHttpApiClient` (`src/api/client.ts`) against
`VITE_BACKEND_URL` (`.env.example`, defaults to `http://localhost:3000`).
`createMockApiClient` + `src/api/fixtures.ts` still back every test in this
package (no live backend needed to run `npm test`).

## Running

```bash
npm install
cp .env.example .env   # point VITE_BACKEND_URL at your backend if not localhost:3000
npm run dev             # needs ../backend running (see ../backend/README.md)
npm run typecheck
npm test                # uses fixtures, no backend needed
```

## How each acceptance criterion is met

| Criterion | Where |
|---|---|
| No page shows a single overall number without category context | `CategorySection` is the only place metrics render, always under a category heading; there's no page-level aggregate component anywhere in `src/pages/` |
| <20 runs in a category → "not enough data yet", no prominent number | `DeltaMetric`, gated by `hasEnoughData` (`MIN_SAMPLE_SIZE = 20`, `src/api/types.ts`) |
| Isolation tier + account diversity visible on every skill detail page, no extra click | Rendered unconditionally inside `CategorySection`, not behind a toggle or a second route |
| Export link works and matches the underlying aggregate | `detail.exportUrl` is per-category, rendered as a real `<a href>` in `CategorySection` |
| Mobile-usable layout | `src/styles.css` is mobile-first (single-column grid below 560px); manually verified at 375×812 in the browser preview — see commit history for the screenshot check, no automated visual-regression test in this phase |

## Tests

19 tests (vitest + Testing Library) cover the criteria table above directly,
plus the category filter and the "not applicable" (vs. a fake zero) security
metric for non-code categories.

## Explicitly not part of this phase

- No blind-voting UI (Phase 7).
- No login/auth for skill authors — read-only view.
- No changes to the aggregation logic itself — only consumption of its
  (not-yet-existing) API.
