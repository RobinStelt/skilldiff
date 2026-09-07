# Batch 2 metadata provenance

Checked on 2026-09-06. `batch2-skill-metadata.json` contains the five reviewed
catalog records. `batch2-repository-sources.json` records GitHub API fields and
fetch timestamps. Existing catalog entries are preserved by the importer.

| Catalog ID | Primary source | Classification / license source |
| --- | --- | --- |
| clawscan | https://github.com/nickoc/clawscan | A scanner for skills, not an individual SKILL.md package. Repository MIT license. |
| clawsec-suite | https://github.com/prompt-security/clawsec/blob/main/skills/clawsec-suite/SKILL.md | Installable suite; repository AGPL-3.0 license. |
| playwright-skill | https://github.com/lackeyjb/playwright-skill | Browser automation skill; repository MIT license. |
| notfair-plugin | https://github.com/nowork-studio/notfair-plugin | Plugin / collection of marketing skills, not one individual skill. Repository MIT license. |
| frontend-design | https://github.com/anthropics/skills/tree/main/skills/frontend-design | Individual skill. Apache-2.0 from its own LICENSE.txt, not repository-wide license metadata. |

Frontend Design license: https://github.com/anthropics/skills/blob/main/skills/frontend-design/LICENSE.txt

Stars refer to the entire linked GitHub repository. They are not skill-specific
install counts or A/B evidence. Maintainer uses the repository owner account.
Descriptions are short editorial summaries of the primary sources. Declared
categories describe catalog topics and do not assign measurement categories.
No skills were installed or executed during this metadata import.

Import from `backend/` with the configured local application database:

```sh
npm exec -- tsx scripts/import-skill-metadata.ts data/batch2-skill-metadata.json
```

Verified against the running local API: eight catalog records in total, all five
new detail endpoints return metadata with no measured categories. Repeating
the import inserts zero records and preserves the five existing entries.

## Real runs (2026-09-07)

Two of the five — `playwright-skill` and `frontend-design` — now have one
real measured comparison each, run for real against a local backend
(`http://localhost:3000`), not synthetic:

| Skill | Category | Task | with/without tokens | Success |
| --- | --- | --- | --- | --- |
| playwright-skill | debugging | Fix a failing Playwright test (wrong `data-testid` selector) | 384,323 / 383,349 | succeeded / succeeded |
| frontend-design | feature | Add a pricing page to a small static demo site | 46,023 / 45,996 | n/a (no check command for static HTML) |

Getting these two real, valid samples required fixing four real bugs in
`cli/` along the way — see that commit's message for details (Tier B
junction creation breaking on forward-slash paths, no way to opt out of
Tier A when Docker is running for unrelated reasons, the auto-detected
check command's Windows spawn bug, and — the significant one — a missing
`--permission-mode` meant every headless run's file edits were silently
denied, so the very first playwright-skill attempt "measured" nothing at
all despite reporting a clean result). Both single-run results above are
one data point each, not yet a statistically meaningful sample — no
"skill helps/doesn't help" conclusion should be drawn from a sample size
of one either way.

The remaining two — `clawsec-suite` (no fair, representative task framed
yet) and `notfair-plugin` (would need real ad accounts to test
meaningfully) — are still metadata-only, deliberately, not from lack of
time.
