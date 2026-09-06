# Privacy Policy

**Draft — not legal advice.** This is a factual description of what the
Skill-A/B Marketplace software actually does, written by the people who
built it, to give you (and a lawyer, before this goes live for real) an
accurate starting point. If you operate this service for the public,
especially from the EU, have this reviewed — GDPR applies, and Germany's
Telemediengesetz/DDG may require an Impressum (operator identification)
that isn't included here. Placeholders below are marked `[…]`.

_Last updated: [DATE]. Operator: [NAME/ENTITY], [ADDRESS], [CONTACT EMAIL]._

## What this service is

The Skill-A/B Marketplace measures whether a Claude Code skill helps with
real tasks, by running a task once with the skill loaded and once without,
automatically, and aggregating the results across many contributors. This
page covers data handled by the **backend and website**. The **CLI**
(`cli/`) runs entirely on your own machine except for what it explicitly
uploads — see "What the CLI sends" below for exactly what that is.

## What we collect, and why

### From CLI uploads (`POST /v1/run-results`)

| Data | What it is | Why |
|---|---|---|
| Pseudonymous account ID | A random identifier generated on your machine — no name, email, or other identity | Attributing runs to one contributor for reputation weighting and anomaly detection, without knowing who you are |
| Run metadata | Skill ID, task category, isolation tier, token counts, duration, success/failure, size bucket, timestamps, CLI/Claude version | The actual measurement — this is the product |
| Category-specific metrics | Test coverage, lint errors, cyclomatic complexity, readability score, or similar, depending on task category | Same as above |
| Security scan counts | Number of findings by severity, with the skill vs. without — never the findings' content or the code itself | Measuring whether a skill introduces or fixes vulnerabilities, without storing your code |
| A cryptographic signature | Proves the upload wasn't altered in transit | Integrity, not identity |

**We do not receive your code, your prompts, or Claude's responses** as
part of a normal upload. The CLI validates every upload against a strict
schema before sending it; content isn't part of that schema unless you
separately opt in (next section).

### Plaintext content — separate, explicit opt-in only

If you explicitly enable it (a separate setting from normal participation,
off by default), a reference to your task's output can be uploaded for
future community review of subjective quality (not yet active — see
"Blind voting" below). This lives in a **separate database table with
restricted access**: normal backend processes cannot read it, only a
dedicated review service can, once that feature exists. You can opt out
again at any time; it only affects uploads made while it's on.

### If you register as a catalog admin

Admin accounts (people who curate skill listings — name, GitHub link,
license, maintainer) store a username and a salted password hash. Nothing
else. Session cookies are `HttpOnly` (not readable by page scripts) and
can be invalidated by logging out.

### Server-side technical data

The application itself does not log requests or IP addresses. Whatever
infrastructure it runs on (a hosting provider, a reverse proxy) likely
keeps its own short-term connection/access logs as standard operational
practice, outside this application's control — `[describe your hosting
provider's logging here once deployed]`.

### What we don't do

- No third-party analytics or ad tracking on the website.
- No cookies for visitors who aren't logged in as an admin.
- No selling or sharing of data with third parties for their own purposes.

## How long we keep it, and how to get yours removed

Run data feeds statistical aggregates (medians, confidence intervals)
shown publicly per skill and category — individual records aren't
deleted automatically, including ones flagged by automated anomaly
detection (flagging lowers their statistical weight; it doesn't hide or
remove them, so the flagging itself stays checkable by anyone).

Because accounts are pseudonymous by design, we can't verify a deletion
request against a name or email — we can verify it against control of
the account's signing secret instead: contact `[CONTACT EMAIL]` with your
account ID, and be ready to sign a challenge string we send you with that
account's local secret to prove it's yours. `[This verification flow is
not automated yet — until it is, deletion requests are handled manually.]`

## Blind voting (planned, not active)

A future phase will let independent reviewers compare anonymized outputs
from consenting contributors. It will use only content submitted under
the separate opt-in above, will remain fully optional, and this policy
will be updated with specifics before that feature ships.

## Your rights (EU/GDPR, where applicable)

Subject to verification as described above: access to what's stored
under your account ID, correction, deletion, and objection to processing.
`[Confirm the correct legal basis (likely legitimate interest / consent)
and add your supervisory authority's contact per GDPR Art. 13 before
publishing.]`

## Changes to this policy

`[Describe how you'll notify contributors of material changes — e.g. a
dated changelog on this page.]`

## Contact

`[CONTACT EMAIL]`
