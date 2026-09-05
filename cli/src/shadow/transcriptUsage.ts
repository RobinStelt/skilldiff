import { readFileSync, existsSync } from "node:fs";
import { sumUsageTokens, type ClaudeUsage } from "../orchestration/runCondition.js";

/**
 * Best-effort extraction of the token usage for the most recent assistant
 * turn from a Claude Code session transcript (JSONL, one message per
 * line). The exact transcript schema is NOT part of any stable, documented
 * API this project can pin a version to — so this is deliberately
 * defensive: it tries every JSON key shape that has been observed to carry
 * a usage object, and returns `null` the moment it can't find one, rather
 * than guessing.
 *
 * Callers MUST treat `null` as "cannot measure this turn" and skip
 * uploading a shadow-mode result for it — NOT as zero tokens, which would
 * misrepresent a real, costly turn as free (src/shadow/worker.ts).
 */
export function extractLatestUsageFromTranscript(transcriptPath: string): number | null {
  if (!existsSync(transcriptPath)) return null;

  let lines: string[];
  try {
    lines = readFileSync(transcriptPath, "utf-8").split("\n").filter((line) => line.trim().length > 0);
  } catch {
    return null;
  }

  // Walk backward — the usage for the turn that just ended is whichever
  // assistant message appears last in the file at the moment Stop fires.
  for (let i = lines.length - 1; i >= 0; i--) {
    const usage = tryExtractUsage(lines[i]!);
    if (usage !== null) return sumUsageTokens(usage);
  }
  return null;
}

function tryExtractUsage(line: string): ClaudeUsage | null {
  let entry: unknown;
  try {
    entry = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof entry !== "object" || entry === null) return null;
  const record = entry as Record<string, unknown>;

  // Known/plausible shapes, checked in order of how likely they are to
  // appear in a Claude Code transcript line:
  //   { type: "assistant", message: { usage: {...} } }  (wraps the raw API message)
  //   { message: { usage: {...} } }
  //   { usage: {...} }
  const candidates = [
    (record.message as Record<string, unknown> | undefined)?.usage,
    record.usage,
  ];
  for (const candidate of candidates) {
    if (isUsageLike(candidate)) return candidate;
  }
  return null;
}

function isUsageLike(value: unknown): value is ClaudeUsage {
  if (typeof value !== "object" || value === null) return false;
  const keys = ["input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"];
  return keys.some((key) => typeof (value as Record<string, unknown>)[key] === "number");
}
