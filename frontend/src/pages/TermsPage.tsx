// Mirrors ../../../TERMS.md — kept in sync manually (see PrivacyPage.tsx for why).
export function TermsPage() {
  return (
    <main className="legal-page">
      <p className="legal-page__draft-notice">
        <strong>Draft — not legal advice.</strong> Written from what the software actually does; have it reviewed
        before relying on it. Placeholders are marked <code>[…]</code>.
      </p>
      <p className="legal-page__meta">
        Last updated: [DATE]. Operator: [NAME/ENTITY], [ADDRESS], [CONTACT EMAIL].
      </p>

      <h1>Terms of Use</h1>

      <h2>What this is</h2>
      <p>
        Skilldiff ("the Service") shows measured, aggregated comparisons of Claude Code skills — each
        based on a task run once with a skill loaded and once without, on a contributor's own machine. The{" "}
        <code>skill-ab</code> CLI (source: [REPO URL], license: [MIT/Apache — confirm]) is what performs and uploads
        these comparisons; the website displays the aggregated results.
      </p>

      <h2>Your responsibility for what you run the CLI against</h2>
      <p>
        You are solely responsible for having the right to run the CLI, and any skill under test, against the code,
        files, and tasks you point it at. The CLI does not upload your code or Claude's output as part of a normal
        run (see the <a href="/privacy">Privacy Policy</a>) — but you still need the underlying rights to process
        that content locally in the first place, including where it involves a third party's proprietary or
        confidential material. Don't run this against anything you're not authorized to process this way.
      </p>

      <h2>No warranty on skill quality</h2>
      <p>
        Numbers on this Service are statistical measurements from real, independently contributed runs — not a
        guarantee, endorsement, or certification of any skill's fitness for your purpose. A skill can measure well
        here and still not suit your specific task. Isolation tier, sample size, and account diversity are shown
        alongside every number specifically so you can judge how much to trust it yourself; a low sample size or
        single-account result is marked as such, not hidden.
      </p>

      <h2>Contributing data honestly</h2>
      <p>By uploading run results, you agree not to:</p>
      <ul>
        <li>
          Falsify, replay, or otherwise manipulate what you upload (the upload signature and schema validation catch
          structural tampering; this covers intent, not just mechanism).
        </li>
        <li>
          Deliberately cherry-pick tasks to make a skill you maintain or have an interest in look better than a
          representative sample would.
        </li>
        <li>
          Attempt to circumvent the reputation, isolation-tier, or anomaly-detection systems that weight
          contributions.
        </li>
      </ul>
      <p>
        We may flag an account or individual records as anomalous using automated heuristics (e.g., an implausibly
        perfect success rate across unrelated task categories, or an implausible volume of uploads for one skill).
        Flagged data is down-weighted and made visible for review — <strong>not</strong> silently deleted — and we
        may, at our discretion, exclude data we determine was submitted in bad faith from public aggregates.
      </p>

      <h2>Skill catalog metadata</h2>
      <p>
        Catalog information (name, description, license, maintainer, GitHub link) is curated by administrators for
        display purposes and is independent of — never influences, and is never influenced by — the measured
        comparison data. [If you accept external submissions/corrections for catalog entries, describe that process
        here.]
      </p>

      <h2>Accounts</h2>
      <p>
        Marketplace accounts are pseudonymous by design — we don't collect your name or email to create one. Admin
        (catalog-curator) accounts require a username and password and are subject to the same rules as any other
        account holder, plus the added responsibility of accurate catalog curation.
      </p>

      <h2>Availability and changes</h2>
      <p>
        The Service is provided on an as-is basis, may change or be discontinued, and we don't guarantee uptime. [Add
        an SLA here only if you actually intend to offer one.]
      </p>

      <h2>Limitation of liability</h2>
      <p>
        [This section needs actual legal drafting for your jurisdiction — a placeholder limitation-of-liability
        clause copied from elsewhere is worse than none, since it can create false confidence. Have this written by
        someone qualified to do it for where you operate.]
      </p>

      <h2>Governing law</h2>
      <p>[Fill in your jurisdiction once operator details are finalized.]</p>

      <h2>Changes to these terms</h2>
      <p>[Describe how you'll notify contributors of material changes.]</p>

      <h2>Contact</h2>
      <p>[CONTACT EMAIL]</p>
    </main>
  );
}
