# Privacy Policy

**Draft — not legal advice.** This is a factual description of what the
SkillDiff software actually does, written by the people who
built it, to give you (and a lawyer, before this goes live for real) an
accurate starting point. If you operate this service for the public,
especially from the EU, have this reviewed — GDPR applies, and Germany's
Digitale-Dienste-Gesetz (DDG, formerly TMG) requires an Impressum
(operator identification), included separately at
[IMPRESSUM.md](IMPRESSUM.md). A few placeholders remain below, marked
`[…]`.

_Last updated: 2026-09-07. Operator: Robin Steltmann, Schulstraße 13, 34479
Breuna, Germany, robin.steltmann@googlemail.com — see also
[IMPRESSUM.md](IMPRESSUM.md)._

## What this service is

SkillDiff measures whether a Claude Code skill helps with
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

The application itself does not log requests or IP addresses. The
production deployment sits behind a Caddy reverse proxy (see
`docker/DEPLOY.md`); as configured, that proxy has no explicit `log`
directive for this site either, so no access log is written there by
default. If that configuration changes, this section needs updating
first. Whatever the underlying server/hosting provider does at the
network level (e.g. a firewall's connection logs) is outside this
application's control.

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
the account's signing secret instead: contact
robin.steltmann@googlemail.com with your account ID, and be ready to sign
a challenge string we send you with that account's local secret to prove
it's yours. This verification flow is not automated yet — until it is,
deletion requests are handled manually.

## Blind voting (planned, not active)

A future phase will let independent reviewers compare anonymized outputs
from consenting contributors. It will use only content submitted under
the separate opt-in above, will remain fully optional, and this policy
will be updated with specifics before that feature ships.

## Your rights (EU/GDPR, where applicable)

Subject to verification as described above: access to what's stored
under your account ID, correction, deletion, and objection to processing.

Legal basis, as best assessed here — **not confirmed by a lawyer, and
that confirmation should still happen before treating this as final**:
run-result data is processed under legitimate interest (Art. 6(1)(f)
GDPR) — measuring skill performance is the service itself, the data is
pseudonymous, and a contributor can object per above. The opt-in
plaintext-content upload is processed under consent (Art. 6(1)(a)), which
is why it defaults off and can be withdrawn at any time. Admin-account
data is processed to perform the admin's own catalog-curation role
(Art. 6(1)(b)).

If you're in the EU/EEA and think your rights haven't been respected, you
can lodge a complaint with your local data protection supervisory
authority. For Germany, that's the authority for the state (Bundesland)
where the operator is based — `[name the specific Landesbeauftragte(r)
für Datenschutz once confirmed; Breuna is in Hesse, so this is likely the
Hessischer Beauftragter für Datenschutz und Informationsfreiheit, but
verify rather than trust this draft on that point]`.

## Changes to this policy

Material changes will be reflected here with an updated "Last updated"
date at the top of this page; no separate notification channel exists yet
beyond checking back on this page.

## Contact

robin.steltmann@googlemail.com — see also [IMPRESSUM.md](IMPRESSUM.md)
for the full operator identification.
