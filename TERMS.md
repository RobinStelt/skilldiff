# Terms of Use

**Draft — not legal advice.** Written from what the software actually
does; have it reviewed before relying on it. Placeholders below are
marked `[…]`.

_Last updated: 2026-09-07. Operator: Robin Steltmann, Schulstraße 13,
34479 Breuna, Germany, robin.steltmann@googlemail.com — see also
[IMPRESSUM.md](IMPRESSUM.md)._

## What this is

SkillDiff ("the Service") shows measured, aggregated
comparisons of Claude Code and Codex skills — each based on a task run once with a
skill loaded and once without, on a contributor's own machine. The
`skill-ab` CLI (source: https://github.com/RobinStelt/skilldiff, license:
MIT, see [`LICENSE`](LICENSE)) is what performs and uploads these
comparisons; the website displays the aggregated results.

## Your responsibility for what you run the CLI against

You are solely responsible for having the right to run the CLI, and any
skill under test, against the code, files, and tasks you point it at. The
CLI does not upload your code or the agent's output as part of a normal run
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
data. External submissions or corrections aren't accepted through any
automated process yet — reach out via the contact below and an admin
applies the change by hand.

## Accounts

Marketplace accounts are pseudonymous by design — we don't collect your
name or email to create one. Admin (catalog-curator) accounts require a
username and password and are subject to the same rules as any other
account holder, plus the added responsibility of accurate catalog
curation.

## Availability and changes

The Service is provided on an as-is basis, may change or be discontinued,
and we don't guarantee uptime. No SLA is offered.

## Limitation of liability

**Draft, not verified by a lawyer — German law (§§ 305 ff. BGB) limits
what a liability clause like this can actually disclaim, especially
toward consumers, so treat the wording below as a starting point for
real legal review, not a finished clause.** The Service is a free,
independently-run measurement tool. To the extent legally permitted, the
operator is liable only for damages caused intentionally or by gross
negligence, and for the negligent breach of a material contractual
obligation (Kardinalpflicht) — in the latter case limited to
foreseeable, typical damage. Liability for injury to life, body, or
health, and any liability under the Produkthaftungsgesetz, is unaffected
and not limited by this clause.

## Governing law

German law applies. `[The specific venue/Gerichtsstand clause is left out
deliberately — for a consumer-facing service, German law restricts which
venue clauses are even enforceable (§ 38 ZPO and consumer-protection
rules), so picking one without legal advice risks writing an invalid
clause into this document. Have a lawyer add this line once the rest of
the Service's legal setup is reviewed.]`

## Changes to these terms

Material changes will be reflected here with an updated "Last updated"
date at the top of this page; no separate notification channel exists yet
beyond checking back on this page.

## Contact

robin.steltmann@googlemail.com — see also [IMPRESSUM.md](IMPRESSUM.md)
for the full operator identification.
