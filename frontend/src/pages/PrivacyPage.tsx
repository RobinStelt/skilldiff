// Mirrors ../../../PRIVACY.md — kept in sync manually (same tradeoff as
// api/fixtures.ts mirroring a schema fixture: no markdown-rendering
// dependency for two static pages). Edit both together.
export function PrivacyPage() {
  return (
    <main className="legal-page">
      <p className="legal-page__draft-notice">
        <strong>Draft — not legal advice.</strong> This is a factual description of what the software actually does.
        Before this goes live for real, have it reviewed — GDPR applies, and Germany's Telemediengesetz/DDG may
        require an Impressum not included here. Placeholders are marked <code>[…]</code>.
      </p>
      <p className="legal-page__meta">
        Last updated: [DATE]. Operator: [NAME/ENTITY], [ADDRESS], [CONTACT EMAIL].
      </p>

      <h1>Privacy Policy</h1>

      <h2>What this service is</h2>
      <p>
        The Skill-A/B Marketplace measures whether a Claude Code skill helps with real tasks, by running a task once
        with the skill loaded and once without, automatically, and aggregating results across many contributors. This
        page covers data handled by the backend and website. The CLI runs entirely on your own machine except for
        what it explicitly uploads.
      </p>

      <h2>What we collect, and why</h2>
      <h3>From CLI uploads (run results)</h3>
      <ul>
        <li>
          <strong>Pseudonymous account ID</strong> — a random identifier generated on your machine, no name or email.
          Used to attribute runs to one contributor for reputation weighting and anomaly detection, without knowing
          who you are.
        </li>
        <li>
          <strong>Run metadata</strong> — skill ID, task category, isolation tier, token counts, duration,
          success/failure, size bucket, timestamps, CLI/Claude version. This is the actual measurement.
        </li>
        <li>
          <strong>Category-specific metrics</strong> — test coverage, lint errors, cyclomatic complexity, readability
          score, or similar, depending on task category.
        </li>
        <li>
          <strong>Security scan counts</strong> — number of findings by severity, with the skill vs. without — never
          the findings' content or the code itself.
        </li>
        <li>
          <strong>A cryptographic signature</strong> — proves the upload wasn't altered in transit; not an identity
          signal.
        </li>
      </ul>
      <p>
        <strong>We do not receive your code, your prompts, or Claude's responses</strong> as part of a normal upload.
        Every upload is validated against a strict schema before being accepted; content isn't part of that schema
        unless you separately opt in.
      </p>

      <h3>Plaintext content — separate, explicit opt-in only</h3>
      <p>
        If you explicitly enable it (off by default, a separate setting from normal participation), a reference to
        your task's output can be uploaded for future community review of subjective quality (not yet active — see
        Blind Voting below). This lives in a separate database table with restricted access: normal backend processes
        cannot read it, only a dedicated review service can, once that feature exists. You can opt out again at any
        time; it only affects uploads made while it's on.
      </p>

      <h3>If you register as a catalog admin</h3>
      <p>
        Admin accounts (people who curate skill listings) store a username and a salted password hash, nothing else.
        Session cookies are HttpOnly (not readable by page scripts) and can be invalidated by logging out.
      </p>

      <h3>Server-side technical data</h3>
      <p>
        The application itself does not log requests or IP addresses. Whatever infrastructure it runs on (a hosting
        provider, a reverse proxy) likely keeps its own short-term connection/access logs as standard operational
        practice, outside this application's control — [describe your hosting provider's logging here once deployed].
      </p>

      <h3>What we don't do</h3>
      <ul>
        <li>No third-party analytics or ad tracking on the website.</li>
        <li>No cookies for visitors who aren't logged in as an admin.</li>
        <li>No selling or sharing of data with third parties for their own purposes.</li>
      </ul>

      <h2>How long we keep it, and how to get yours removed</h2>
      <p>
        Run data feeds statistical aggregates (medians, confidence intervals) shown publicly per skill and category —
        individual records aren't deleted automatically, including ones flagged by automated anomaly detection
        (flagging lowers their statistical weight; it doesn't hide or remove them, so the flagging itself stays
        checkable by anyone).
      </p>
      <p>
        Because accounts are pseudonymous by design, we can't verify a deletion request against a name or email — we
        can verify it against control of the account's signing secret instead: contact [CONTACT EMAIL] with your
        account ID, and be ready to sign a challenge string we send you with that account's local secret to prove
        it's yours. [This verification flow is not automated yet — until it is, deletion requests are handled
        manually.]
      </p>

      <h2>Blind voting (planned, not active)</h2>
      <p>
        A future phase will let independent reviewers compare anonymized outputs from consenting contributors. It
        will use only content submitted under the separate opt-in above, will remain fully optional, and this policy
        will be updated with specifics before that feature ships.
      </p>

      <h2>Your rights (EU/GDPR, where applicable)</h2>
      <p>
        Subject to verification as described above: access to what's stored under your account ID, correction,
        deletion, and objection to processing. [Confirm the correct legal basis (likely legitimate interest /
        consent) and add your supervisory authority's contact per GDPR Art. 13 before publishing.]
      </p>

      <h2>Changes to this policy</h2>
      <p>[Describe how you'll notify contributors of material changes — e.g. a dated changelog on this page.]</p>

      <h2>Contact</h2>
      <p>[CONTACT EMAIL]</p>
    </main>
  );
}
