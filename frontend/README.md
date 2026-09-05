# frontend — public marketplace view (Phase 4)

Implements `05-marktplatz-phase4-frontend.md`. Full context:
`../skill-ab-marktplatz-plan.md`, sections 5 (evaluation dimensions) and 7
(residual risks, especially the trust-through-transparency principle).

## Status: built against a documented API contract, not the real backend

The backend (Phase 3, `../backend`) doesn't expose an HTTP layer yet — only
the internal `src/aggregation/*`, `src/accounts/*`, and `src/anomaly/*`
modules exist, no `src/server.ts`. Rather than block Phase 4 on that (backend
work is happening in parallel), this app is built and fully tested against
`src/api/types.ts` — a contract that mirrors the backend's existing
`DeltaStats`/`SkillCategoryMetrics` shapes field-for-field, plus the fields
this phase's briefing needs that aggregation doesn't compute yet.

`src/main.tsx` wires up `createMockApiClient` (in-memory, backed by
`src/api/fixtures.ts`) so the app runs and every acceptance criterion below
is testable today. `src/api/client.ts` (`createHttpApiClient`) is the real
HTTP client for once the backend ships — swapping it in is a one-line change
in `main.tsx`.

### Backend gap — what `../backend` still needs to add

1. **`GET /api/skills?category=<category>&cursor=<cursor>`** and
   **`GET /api/skills/:skillId`** — an HTTP layer around
   `aggregateSkillCategory` (`backend/src/aggregation/metrics.ts`). The
   `DeltaStats`/`SkillCategoryMetrics` shapes already match what this
   frontend expects.
2. **Isolation-tier breakdown per skill+category** (`{ A, B, C }` counts) —
   `run_results.isolation_tier` is already in the schema
   (`backend/db/migrations/001_init.sql`), but no aggregation query groups by
   it yet.
3. **Distinct contributing account count per skill+category** — same
   situation: `account_id` is on every row, just not counted distinctly
   anywhere yet.
4. **A `seedDataMajority` flag per skill+category** — depends on Phase 6
   (pre-fill) tagging its inserted rows so they're distinguishable later;
   not yet decided how in either phase's briefing.
5. **A raw-data export endpoint** (`GET /api/skills/:skillId/export?category=`)
   returning exactly the records behind one skill+category aggregate —
   briefing point 6 requires this to be spot-checkable by hand.
6. **An `aggregationSourceUrl`** — just the repo link to
   `backend/src/aggregation`, no new code needed, just wiring it into the
   response.

None of this changes `aggregateSkillCategory`'s existing logic — it's
additive.

## Running

```bash
npm install
npm run dev       # mock data, see src/api/fixtures.ts
npm run typecheck
npm test
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
