# Terms of Use

**Draft — not legal advice.** Written from what the software actually
does; have it reviewed before relying on it. Placeholders below are
marked `[…]`.

_Last updated: [DATE]. Operator: [NAME/ENTITY], [ADDRESS], [CONTACT EMAIL]._

## What this is

SkillDiff ("the Service") shows measured, aggregated
comparisons of Claude Code skills — each based on a task run once with a
skill loaded and once without, on a contributor's own machine. The
`skill-ab` CLI (source: `[REPO URL]`, license: `[MIT/Apache — confirm]`)
is what performs and uploads these comparisons; the website displays the
aggregated results.

## Your responsibility for what you run the CLI against

You are solely responsible for having the right to run the CLI, and any
skill under test, against the code, files, and tasks you point it at. The
CLI does not upload your code or Claude's output as part of a normal run
(see [`PRIVACY.md`](PRIVACY.md)) — but you still need the underlying
rights to process that content locally in the first place, including
where it involves a third party's proprietary or confidential material.
Don't run this against anything you're not authorized to process this
way.

## No warranty on skill quality

Numbers on this Service are statistical measurements from real,
independently contributed runs — not a guarantee, endorsement, or
certification of any skill's fitness for your purpose. A skill can
measure well here and still not suit your specific task. Isolation tier,
sample size, and account diversity are shown alongside every number
specifically so you can judge how much to trust it yourself; a low
sample size or single-account result is marked as such, not hidden.

## Contributing data honestly

By uploading run results, you agree not to:

- Falsify, replay, or otherwise manipulate what you upload (the upload
  signature and schema validation catch structural tampering; this
  covers intent, not just mechanism).
- Deliberately cherry-pick tasks to make a skill you maintain or have an
  interest in look better than a representative sample would.
- Attempt to circumvent the reputation, isolation-tier, or anomaly-
  detection systems that weight contributions.

We may flag an account or individual records as anomalous using automated
heuristics (e.g., an implausibly perfect success rate across unrelated
task categories, or an implausible volume of uploads for one skill).
Flagged data is down-weighted and made visible for review — **not**
silently deleted — and we may, at our discretion, exclude data we
determine was submitted in bad faith from public aggregates.

## Skill catalog metadata

Catalog information (name, description, license, maintainer, GitHub link)
is curated by administrators for display purposes and is independent of —
never influences, and is never influenced by — the measured comparison
data. `[If you accept external submissions/corrections for catalog
entries, describe that process here.]`

## Accounts

Marketplace accounts are pseudonymous by design — we don't collect your
name or email to create one. Admin (catalog-curator) accounts require a
username and password and are subject to the same rules as any other
account holder, plus the added responsibility of accurate catalog
curation.

## Availability and changes

The Service is provided on an as-is basis, may change or be discontinued,
and we don't guarantee uptime. `[Add an SLA here only if you actually
intend to offer one.]`

## Limitation of liability

`[This section needs actual legal drafting for your jurisdiction — a
placeholder limitation-of-liability clause copied from elsewhere is worse
than none, since it can create false confidence. Have this written by
someone qualified to do it for where you operate.]`

## Governing law

`[Fill in your jurisdiction once operator details are finalized.]`

## Changes to these terms

`[Describe how you'll notify contributors of material changes.]`

## Contact

`[CONTACT EMAIL]`
