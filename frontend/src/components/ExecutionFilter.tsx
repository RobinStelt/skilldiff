import { useState } from "react";
import type { Agent, Execution, ExecutionFilter as Filter } from "@skilldiff/schema";

export function executionLabel(execution?: Execution): string {
  return `${execution?.agent === "codex" ? "Codex" : "Claude Code"} · ${execution?.model ?? "unknown model"}${execution?.reasoning_effort ? ` · ${execution.reasoning_effort}` : ""}`;
}

export function ExecutionFilter({ value, onChange }: { value: Filter; onChange: (filter: Filter) => void }) {
  const [model, setModel] = useState(value.model ?? "");
  return (
    <form className="execution-filter" aria-label="Filter by agent and model" onSubmit={(event) => {
      event.preventDefault(); onChange({ ...value, model: model.trim() || undefined });
    }}>
      <label>Agent <select value={value.agent ?? ""} onChange={(event) => {
        setModel(""); onChange({ agent: (event.target.value || undefined) as Agent | undefined });
      }}>
        <option value="">All agents</option><option value="claude">Claude Code</option><option value="codex">Codex / OpenAI</option>
      </select></label>
      <label>Model <input value={model} placeholder="All models" onChange={(event) => setModel(event.target.value)} /></label>
      <button className="button button--outline button--small" type="submit">Apply model filter</button>
      {(value.agent || value.model) && <button className="button button--outline button--small" type="button" onClick={() => { setModel(""); onChange({}); }}>Clear model filters</button>}
    </form>
  );
}
