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
