import { useState } from "react";
import { Arrow, GETTING_STARTED_URL } from "./SiteHeader.js";
import { DiffMark, MetricGraphic, RunDiagram } from "./EvidenceGraphics.js";

const RUN_COMMAND =
  'skill-ab run --skill my-skill --skill-source ../my-skill --dir ./my-project --task "Fix the failing tests"';

export function EvidenceStrip() {
  return (
    <div className="evidence-strip">
      <div className="evidence-strip__inner">
        <span className="evidence-strip__intro">THE SKILLDIFF STANDARD</span>
        <span>
          <i aria-hidden="true">01 /</i> REAL TASKS
        </span>
        <span>
          <i aria-hidden="true">02 /</i> PAIRED COMPARISONS
        </span>
        <span>
          <i aria-hidden="true">03 /</i> OPEN METHODOLOGY
        </span>
        <span className="evidence-strip__asterisk" aria-hidden="true">
          ✳
        </span>
      </div>
    </div>
  );
}

export function MethodSection() {
  return (
    <section id="how-it-works" className="method-section content-shell" aria-labelledby="method-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">01 — INSIDE THE EXPERIMENT</span>
          <h2 id="method-title">
            One task.
            <br />
            <span className="text-muted">Two runs.</span>
          </h2>
        </div>
        <p>
          A skill changes how an agent works.
          <br />
          We run both sides to find out what that means.
        </p>
      </div>
      <div className="lab-layout">
        <figure className="lab-image">
          <img
            src="/images/skilldiff-optics.webp"
            alt=""
            width="1536"
            height="1024"
            loading="lazy"
            decoding="async"
          />
          <div className="lab-image__cross" aria-hidden="true">
            +
          </div>
          <figcaption>
            <span>THE PRINCIPLE</span>
            <strong>
              Isolate the variable.
              <br />
              Reveal the difference.
            </strong>
            <span className="lab-image__footnote">A visual study in comparison.</span>
          </figcaption>
        </figure>
        <RunDiagram />
      </div>
      <ol className="method-notes">
        <li>
          <span className="method-number">01</span>
          <h3>Keep the starting point.</h3>
          <p>Fresh working copies give both runs the same task and project context.</p>
        </li>
        <li>
          <span className="method-number">02</span>
          <h3>Change one variable.</h3>
          <p>
            The selected skill is loaded in one run. Run order is randomized; the isolation tier is recorded.
          </p>
        </li>
        <li>
          <span className="method-number">03</span>
          <h3>Keep the context.</h3>
          <p>
            Sample sizes, confidence intervals, contributor diversity, and raw exports stay with the results.
          </p>
        </li>
      </ol>
      <div className="measurement-strip" aria-label="Measurement dimensions">
        <div>
          <MetricGraphic kind="success" />
          <div>
            <span className="diagram-label">01 / TASK SUCCESS</span>
            <p>Did it solve the task?</p>
          </div>
        </div>
        <div>
          <MetricGraphic kind="tokens" />
          <div>
            <span className="diagram-label">02 / TOKEN USAGE</span>
            <p>What did it take?</p>
          </div>
        </div>
        <div>
          <MetricGraphic kind="time" />
          <div>
            <span className="diagram-label">03 / EXECUTION TIME</span>
            <p>How long did it run?</p>
          </div>
        </div>
      </div>
      <p className="measurement-note">
        Security deltas are also included where applicable. Every result is grouped by task category.
      </p>
    </section>
  );
}

export function ContributeSection() {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(RUN_COMMAND);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <section className="contribute-section" aria-labelledby="contribute-title">
      <div className="contribute-section__inner content-shell">
        <div className="contribute-section__copy">
          <span className="eyebrow">03 — MAKE YOUR NEXT RUN COUNT</span>
          <h2 id="contribute-title">
            Got a skill?
            <br />
            Let's see it.
          </h2>
          <p>
            Put it to the test on your own project. Keep your results local, or share them with a marketplace
            backend.
          </p>
          <a className="button button--dark" href={GETTING_STARTED_URL} target="_blank" rel="noreferrer">
            Run your first comparison <Arrow diagonal />
          </a>
          <a className="contribute-docs" href={GETTING_STARTED_URL} target="_blank" rel="noreferrer">
            CLI installation & setup <Arrow />
          </a>
        </div>
        <div className="contribute-section__terminal">
          <div className="contribute-monogram" aria-hidden="true">
            <DiffMark />
          </div>
          <div className="cli-preview">
            <div className="cli-preview__bar">
              <span>SKILLDIFF / LOCAL EXPERIMENT</span>
              <span aria-hidden="true">↗</span>
            </div>
            <div className="cli-preview__body">
              <p className="cli-preview__comment"># After installing the CLI from source</p>
              <pre>
                <code>
                  <span className="cli-preview__prompt" aria-hidden="true">
                    ${" "}
                  </span>
                  {RUN_COMMAND.replaceAll(" --", " \\\n  --")}
                </code>
              </pre>
              <div className="cli-preview__bottom">
                <span>
                  <span className="status-dot" /> Local by default.
                </span>
                <button
                  type="button"
                  className="copy-button"
                  onClick={copyCommand}
                  aria-label={copyStatus === "copied" ? "Command copied" : "Copy CLI command"}
                >
                  {copyStatus === "copied" ? "✓ Copied" : "Copy command"}
                </button>
              </div>
              <span role="status" className={copyStatus === "failed" ? "copy-status" : "sr-only"}>
                {copyStatus === "copied"
                  ? "Command copied to clipboard."
                  : copyStatus === "failed"
                    ? "Clipboard unavailable. Select the command above to copy it."
                    : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
