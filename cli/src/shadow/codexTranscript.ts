import { readFileSync } from "node:fs";
import { codexUsageTokens } from "../agents/adapter.js";

export interface CodexTranscriptSnapshot {
  tokens: number;
  model: string | null;
  effort: string | null;
  turnId: string | null;
}

/** Rollout transcripts are not a stable API. Unknown formats cause the hook to skip. */
export function readCodexSnapshot(path: string | null): CodexTranscriptSnapshot | null {
  if (!path) return null;
  try {
    let tokens: number | null = null;
    let model: string | null = null;
    let effort: string | null = null;
    let turnId: string | null = null;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean)) {
      const event = JSON.parse(line);
      if (event.type === "turn_context") {
        model = typeof event.payload?.model === "string" ? event.payload.model : null;
        effort = typeof event.payload?.effort === "string" ? event.payload.effort : null;
        turnId = typeof event.payload?.turn_id === "string" ? event.payload.turn_id : null;
      }
      if (event.type === "event_msg" && event.payload?.type === "token_count") {
        tokens = codexUsageTokens(event.payload.info?.total_token_usage);
      }
    }
    return tokens === null ? null : { tokens, model, effort, turnId };
  } catch { return null; }
}
