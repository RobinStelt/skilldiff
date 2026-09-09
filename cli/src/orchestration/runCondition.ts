import type { Execution } from "@skilldiff/schema";
import { verifyCodexModel } from "../agents/codexModel.js";
import type { Agent } from "@skilldiff/schema";
import { parseCodexUsage } from "../agents/adapter.js";
import type { RunOutcome } from "@skilldiff/schema";
import type { ProcessRunner } from "./processRunner.js";

export interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface ClaudeUsageJson {
  result?: string;
  is_error?: boolean;
  duration_ms?: number;
  usage?: ClaudeUsage;
}

/**
 * Same token-counting convention everywhere it's needed — `claude -p
 * --output-format json` (this file) AND the transcript-based shadow-mode
 * measurement (src/shadow/transcriptUsage.ts) MUST sum tokens identically,
 * otherwise a foreground and a background run of the same task would not
 * be comparable.
 */
export function sumUsageTokens(usage: ClaudeUsage | undefined): number {
  if (!usage) return 0;
  return (
    (usage.input_tokens ?? 0) +
    (usage.output_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0)
  );
}

/**
 * Extracts token and duration numbers from the `--output-format json`
 * output of `claude -p`. Falls back to `null`/0 if the format changed or
 * parsing fails — does NOT abort the run, because an unreadable usage
 * object isn't a reason to discard the whole comparison.
 */
export function parseClaudeUsage(stdout: string): { tokens: number; durationMs: number } {
  try {
    const parsed = JSON.parse(stdout) as ClaudeUsageJson;
    return { tokens: sumUsageTokens(parsed.usage), durationMs: parsed.duration_ms ?? 0 };
  } catch {
    return { tokens: 0, durationMs: 0 };
  }
}

export interface RunConditionParams {
  runner: ProcessRunner;
  agent?: Agent;
  execution?: Execution;
  onExecution?: (execution: Execution) => void;
  claudeBin: string;
  claudeArgs: string[];
  workDir: string;
  env: NodeJS.ProcessEnv;
  /**
   * Check command for success (test/lint/build) — exit code decides.
   * `null` if none was given/detected → `success: null`.
   */
  checkCommand: { cmd: string; args: string[] } | null;
}

/**
 * Runs exactly ONE condition (plan section 5, design decision: 1 run
 * instead of 3 repetitions). No manual rating, no repeated execution —
 * success comes exclusively from the check command's exit code, never from
 * asking the user.
 */
export async function runCondition(params: RunConditionParams): Promise<RunOutcome> {
  const { runner, claudeBin, claudeArgs, workDir, env, checkCommand } = params;

  const start = Date.now();
  const claudeResult = await runner.run(claudeBin, claudeArgs, { cwd: workDir, env });
  const wallClockMs = Date.now() - start;
  if (claudeResult.exitCode !== 0) throw new Error(`Agent process failed (exit ${claudeResult.exitCode}); no comparison result will be uploaded.`);
  if (params.agent !== "codex") {
    const output = JSON.parse(claudeResult.stdout);
    if (output.is_error) throw new Error("Claude did not complete the comparison task.");
  }
  const { tokens, durationMs } = params.agent === "codex" ? parseCodexUsage(claudeResult.stdout) : parseClaudeUsage(claudeResult.stdout);

  if (params.agent === "codex" && params.execution) {
    if (!env.CODEX_HOME) throw new Error("Codex model verification requires an isolated CODEX_HOME.");
    const observed = verifyCodexModel(env.CODEX_HOME, claudeResult.stdout, params.execution);
    params.onExecution?.(observed);
  }

  let success: boolean | null = null;
  if (checkCommand) {
    // useShell: true here, never for the `claude` call above — see
    // processRunner.ts's comment for why those two calls need opposite
    // settings (npm needs shell resolution; claude's task argument
    // breaks under it).
    const checkResult = await runner.run(checkCommand.cmd, checkCommand.args, { cwd: workDir, env, useShell: true });
    success = checkResult.exitCode === 0;
  }

  return {
    success,
    tokens,
    // duration_ms from the claude output is more precise (pure model time),
    // but falls back to the measured wall-clock time if the field is missing.
    duration_sec: Math.round((durationMs || wallClockMs) / 1000),
  };
}
