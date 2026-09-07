# @skilldiff/schema

Binding contract layer between the CLI (Phase 2) and backend (Phase 3) of
SkillDiff. A pure schema package — **no** runtime
dependency on CLI or backend code, so both can import it independently.

Full project context: `../skill-ab-marktplatz-plan.md`, section 4 (data
schema) and section 5 (evaluation dimensions) — written in German, the
project's planning language. This README only explains how to use the
package, not why the schema looks the way it does.

## Single source of truth

`src/schema.ts` holds the Zod schema everything else is derived from:

- **TypeScript types** (`src/types.ts`) via `z.infer<>`
- **JSON schema** (`run-result.schema.json`) via `npm run build:json-schema`
  (uses `zod-to-json-schema`) — for backend runtime validation where no
  Node/Zod runtime is available

Change field rules **only** in `src/schema.ts`. Types and JSON schema follow
automatically.

⚠️ **Limitation of the JSON schema export:** the cross-field rule
"`content_ref` only set when `content_opt_in === true`" is implemented as a
`.superRefine()` on the Zod side and cannot be exported losslessly to JSON
schema. A backend that relies exclusively on the exported JSON schema
(instead of the Zod runtime directly) must check this one rule separately.
Every other rule (including the `category`<->`security_delta` and
`category`<->`category_metrics` coupling via the discriminated union) is
fully represented in the JSON schema.

## Usage in CLI/backend

```ts
import { validateRunResult, type RunResult } from "@skilldiff/schema";

const result = validateRunResult(unknownData);
if (Array.isArray(result)) {
  // result: ValidationError[] — each { path, message }
  console.error("Invalid RunResult:", result);
} else {
  // result: RunResult — fully typed, including category_metrics
  // correctly narrowed based on result.category
  submitToBackend(result);
}
```

All public exports go through `src/index.ts` — never import from deeper
paths (`src/schema.ts`, `src/validate.ts`, …), so the internal structure
stays free to change.

## Core rules the validation enforces

1. `category_metrics` is structurally coupled to `category` (discriminated
   union): `debugging`/`feature` → `test_coverage_pct`, `lint_errors`,
   `ci_status`; `refactoring` → `cyclomatic_complexity_before/after`,
   `diff_size_loc`; `docs` → `readability_score`; `marketing`/`other` →
   `null`.
2. `security_delta` must be `null` except for `debugging`/`feature`/
   `refactoring` (there it's optional — `null` when no code artifact was
   produced).
3. `content_ref` may only be set when `content_opt_in === true`.
4. `isolation_tier` is exclusively `"A"`, `"B"`, or `"C"`.

No `RegressionCheck` type — a regression re-check is deliberately not part
of this project (plan, sections 4 & 8).

## Fixtures

`fixtures/valid/` — one valid run per category.
`fixtures/invalid/` — three deliberately invalid examples (one violation per
rule above from 2–4). Both directories are read automatically by
`test/validate.test.ts`; a new fixture is picked up without any code change.

## Scripts

```bash
npm run typecheck        # tsc --noEmit
npm test                 # vitest run
npm run build:json-schema  # writes run-result.schema.json
```

## Installation (local, until this is published as its own npm package)

```bash
cd schema
npm install
```
