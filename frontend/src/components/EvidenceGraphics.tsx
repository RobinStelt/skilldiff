export function DiffMark() {
  return (
    <svg className="diff-mark" width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M3 7h10l10 22H13L3 7Z" fill="currentColor" />
      <path d="M19 7h10l4 9H23l-4-9Z" fill="currentColor" />
      <path d="m26 22 3 7h4v-7h-7Z" fill="currentColor" opacity=".45" />
    </svg>
  );
}

export function RunDiagram() {
  return (
    <div className="run-diagram" role="group" aria-label="Paired evaluation workflow">
      <div className="run-diagram__heading">
        <span>EXPERIMENT SCHEMATIC</span>
        <span>FIG. 01</span>
      </div>
      <div className="diagram-task">
        <span className="diagram-task__icon" aria-hidden="true">
          ⌘
        </span>
        <div>
          <span className="diagram-label">THE REFERENCE POINT</span>
          <strong>Your task + your project</strong>
        </div>
        <span className="diagram-task__plus" aria-hidden="true">
          +
        </span>
      </div>
      <svg className="diagram-connector" viewBox="0 0 500 45" fill="none" aria-hidden="true">
        <path d="M250 0v20H120v25m130-25h130v25" stroke="currentColor" />
        <circle cx="250" cy="20" r="3" fill="currentColor" />
      </svg>
      <div className="diagram-pair">
        <div className="diagram-run">
          <span className="diagram-run__letter" aria-hidden="true">
            A
          </span>
          <span className="diagram-label">CONTROL</span>
          <h3>Without skill</h3>
          <p>
            Fresh working copy.
            <br />
            Selected skill absent.
          </p>
          <div className="diagram-run__code" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="diagram-run diagram-run--skill">
          <span className="diagram-run__letter" aria-hidden="true">
            B
          </span>
          <span className="diagram-label">EXPERIMENT</span>
          <h3>With skill</h3>
          <p>
            Same starting point.
            <br />
            Selected skill loaded.
          </p>
          <div className="diagram-run__code" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
      <svg className="diagram-connector" viewBox="0 0 500 45" fill="none" aria-hidden="true">
        <path d="M120 0v22h260V0M250 22v23" stroke="currentColor" />
        <circle cx="250" cy="22" r="3" fill="currentColor" />
      </svg>
      <div className="diagram-output">
        <span aria-hidden="true">Δ</span>
        <div>
          <span className="diagram-label">THE DIFFERENCE, BY CATEGORY</span>
          <strong>Success · Tokens · Time</strong>
        </div>
        <span className="diagram-output__arrow" aria-hidden="true">
          ↗
        </span>
      </div>
    </div>
  );
}

export function MetricGraphic({ kind }: { kind: "success" | "tokens" | "time" }) {
  return (
    <svg
      className="metric-graphic"
      width="90"
      height="60"
      viewBox="0 0 90 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      {kind === "success" && (
        <>
          <rect x="18" y="5" width="46" height="46" rx="1" opacity=".25" />
          <rect x="25" y="12" width="46" height="46" rx="1" />
          <path d="m36 34 8 8 17-19" strokeWidth="2" />
          <path d="M5 19h7M9 15v8M76 44h8M80 40v8" opacity=".5" />
        </>
      )}
      {kind === "tokens" && (
        <>
          <path d="m45 5 34 16-34 17L11 21 45 5Z" />
          <path d="m11 31 34 17 34-17m-68 10 34 17 34-17" />
          <path d="M45 6v31m-16-23 34 16M28 29l34-16" opacity=".35" />
        </>
      )}
      {kind === "time" && (
        <>
          <circle cx="45" cy="32" r="24" />
          <path d="M45 9v6m23 17h-6M45 55v-6M22 32h6M39 2h12m-6 0v6m17 6 6-6" opacity=".55" />
          <path d="M45 18v14l11 8" strokeWidth="2" />
          <circle cx="45" cy="32" r="2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
