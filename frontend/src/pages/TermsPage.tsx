// Mirrors ../../../TERMS.md — kept in sync manually (see PrivacyPage.tsx for why).
export function TermsPage() {
  return (
    <main className="legal-page">
      <p className="legal-page__draft-notice">
        <strong>Draft — not legal advice.</strong> Written from what the software actually does; have it reviewed
        before relying on it. Placeholders are marked <code>[…]</code>.
      </p>
      <p className="legal-page__meta">
        Last updated: 2026-09-07. Operator: Robin Steltmann, Schulstraße 13, 34479 Breuna, Germany,
        robin.steltmann@googlemail.com — see also <a href="/impressum">Impressum</a>.
      </p>

      <h1>Terms of Use</h1>

      <h2>What this is</h2>
      <p>
        Skilldiff ("the Service") shows measured, aggregated comparisons of Claude Code and Codex skills — each
        based on a task run once with a skill loaded and once without, on a contributor's own machine. The{" "}
        <code>skill-ab</code> CLI (source:{" "}
        <a href="https://github.com/RobinStelt/skilldiff">github.com/RobinStelt/skilldiff</a>, license: MIT) is what
        performs and uploads these comparisons; the website displays the aggregated results.
      </p>

      <h2>Your responsibility for what you run the CLI against</h2>
      <p>
        You are solely responsible for having the right to run the CLI, and any skill under test, against the code,
        files, and tasks you point it at. The CLI does not upload your code or the agent's output as part of a normal
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
        comparison data. External submissions or corrections aren't accepted through any automated process yet —
        reach out via the contact below and an admin applies the change by hand.
      </p>

      <h2>Accounts</h2>
      <p>
        Marketplace accounts are pseudonymous by design — we don't collect your name or email to create one. Admin
        (catalog-curator) accounts require a username and password and are subject to the same rules as any other
        account holder, plus the added responsibility of accurate catalog curation.
      </p>

      <h2>Availability and changes</h2>
      <p>The Service is provided on an as-is basis, may change or be discontinued, and we don't guarantee uptime. No SLA is offered.</p>

      <h2>Limitation of liability</h2>
      <p>
        <strong>Draft, not verified by a lawyer</strong> — German law (§§ 305 ff. BGB) limits what a liability clause
        like this can actually disclaim, especially toward consumers, so treat the wording below as a starting point
        for real legal review, not a finished clause. The Service is a free, independently-run measurement tool. To
        the extent legally permitted, the operator is liable only for damages caused intentionally or by gross
        negligence, and for the negligent breach of a material contractual obligation (Kardinalpflicht) — in the
        latter case limited to foreseeable, typical damage. Liability for injury to life, body, or health, and any
        liability under the Produkthaftungsgesetz, is unaffected and not limited by this clause.
      </p>

      <h2>Governing law</h2>
      <p>
        German law applies. The specific venue/Gerichtsstand clause is left out deliberately — for a consumer-facing
        service, German law restricts which venue clauses are even enforceable (§ 38 ZPO and consumer-protection
        rules), so picking one without legal advice risks writing an invalid clause into this document. Have a
        lawyer add this line once the rest of the Service's legal setup is reviewed.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        Material changes will be reflected here with an updated "Last updated" date at the top of this page; no
        separate notification channel exists yet beyond checking back on this page.
      </p>

      <h2>Contact</h2>
      <p>
        robin.steltmann@googlemail.com — see also <a href="/impressum">Impressum</a> for the full operator
        identification.
      </p>
    </main>
  );
}
