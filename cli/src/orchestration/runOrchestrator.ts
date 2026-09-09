import type { Agent, Execution } from "@skilldiff/schema";
import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import type { IsolationTier, RunOutcome } from "@skilldiff/schema";
import type { LinkCapability, Condition } from "../isolation/types.js";
import { applyTierBGate, createIsolatedHome, applyCopyGate, isolatedAgentEnv } from "../isolation/gating.js";
import { runCondition } from "./runCondition.js";
import type { ProcessRunner } from "./processRunner.js";
import { randomizeOrder } from "./randomize.js";

export interface Invocation {
  bin: string;
  args: string[];
}

export interface OrchestratorParams {
  runner: ProcessRunner;
  agent?: Agent;
  execution?: Execution;
  /**
   * Builds the actual invocation for ONE condition in ONE working
   * directory. For Tier B/C this is usually a direct `claude` call, for
   * Tier A a `docker run ...` wrapper (see `isolation/dockerRun.ts`) — the
   * orchestrator itself doesn't know the difference, it just invokes.
   */
  buildInvocation: (condition: Condition, workDirCopy: string, codexHome?: string) => Invocation;
  originalWorkDir: string;
  skillId: string;
  skillSourceDir: string | null;
  tier: IsolationTier;
  linkCapability: LinkCapability;
  checkCommand: { cmd: string; args: string[] } | null;
  rng?: () => number;
}

export interface ConditionOutcome {
  condition: Condition;
  execution?: Execution;
  runOutcome: RunOutcome;
  /** Fresh working copy this condition ran in — the basis for category/security analysis afterwards. */
  workDirCopy: string;
}

export interface OrchestratorResult {
  orderRandomized: boolean;
  withSkill: ConditionOutcome;
  withoutSkill: ConditionOutcome;
}

/**
 * Copies the original working directory into a fresh temp directory.
 *
 * Needed for "fresh, mutually isolated sessions — no shared context between
 * the two conditions" (briefing, point 1): if both conditions ran in the
 * same directory, file changes from the first run could influence the
 * second, and the order would skew the result instead of just its display.
 */
/** Exported for src/shadow/worker.ts, which needs the exact same "fresh, independent copy" mechanism outside the normal with/without pair. */
export function freshWorkDirCopy(originalWorkDir: string, label: string): string {
  const copy = mkdtempSync(join(tmpdir(), `skill-ab-${label}-`));
  cpSync(originalWorkDir, copy, { recursive: true });
  return copy;
}

/** Only delete directories created by this runner beneath the system temp root. */
export function removeWorkDirCopy(path: string): void {
  const absolute = resolve(path);
  if (dirname(absolute).toLowerCase() !== resolve(tmpdir()).toLowerCase() || !basename(absolute).startsWith("skill-ab-")) return;
  rmSync(absolute, { recursive: true, force: true });
}

async function runOneCondition(params: {
  o: OrchestratorParams;
  condition: Condition;
}): Promise<ConditionOutcome> {
  const { o, condition } = params;
  const workDirCopy = freshWorkDirCopy(o.originalWorkDir, condition);
  const isolatedHome = createIsolatedHome(undefined, o.agent);

  try {
    if (o.tier === "B" && o.skillSourceDir) {
      applyTierBGate({
        agent: o.agent,
        workDir: workDirCopy,
        skillId: o.skillId,
        skillSourceDir: o.skillSourceDir,
        condition,
        linkCapability: o.linkCapability,
      });
    }

    if (o.tier !== "B") applyCopyGate(workDirCopy, o.skillId, o.tier === "C" ? o.skillSourceDir : null, condition, o.agent ?? "claude");
    const env = isolatedAgentEnv(isolatedHome.path, o.agent ?? "claude");

    const invocation = o.buildInvocation(condition, workDirCopy, env.CODEX_HOME);
    let execution: Execution | undefined;
    const runOutcome = await runCondition({
      execution: o.execution,
      onExecution: (observed) => { execution = observed; },
      runner: o.runner,
      agent: o.agent,
      claudeBin: invocation.bin,
      claudeArgs: invocation.args,
      workDir: workDirCopy,
      env,
      checkCommand: o.checkCommand,
    });

    return { condition, runOutcome, workDirCopy, ...(execution ? { execution } : {}) };
  } catch (error) {
    removeWorkDirCopy(workDirCopy);
    throw error;
  } finally {
    isolatedHome.cleanup();
    // workDirCopy is deliberately NOT deleted here — category detection
    // and the security scan still run on the copies afterwards. Cleanup is
    // the caller's job (see cleanupWorkDirCopies).
  }
}

/**
 * Runs both conditions in randomized order. Exactly 1 run per condition
 * (briefing, point 3) — no repetition.
 */
export async function runComparison(o: OrchestratorParams): Promise<OrchestratorResult> {
  const order = randomizeOrder(o.rng);

  const firstResult = await runOneCondition({ o, condition: order.first });
  let secondResult: ConditionOutcome;
  try { secondResult = await runOneCondition({ o, condition: order.second }); }
  catch (error) { removeWorkDirCopy(firstResult.workDirCopy); throw error; }

  const withSkill = firstResult.condition === "with_skill" ? firstResult : secondResult;
  const withoutSkill = firstResult.condition === "without_skill" ? firstResult : secondResult;

  if (withSkill.execution && withoutSkill.execution && (withSkill.execution.model !== withoutSkill.execution.model || withSkill.execution.reasoning_effort !== withoutSkill.execution.reasoning_effort)) {
    removeWorkDirCopy(withSkill.workDirCopy); removeWorkDirCopy(withoutSkill.workDirCopy);
    throw new Error("A/B conditions used different models or reasoning efforts; no result will be uploaded.");
  }
  return { orderRandomized: order.randomized, withSkill, withoutSkill };
}

export function cleanupWorkDirCopies(result: OrchestratorResult): void {
  removeWorkDirCopy(result.withSkill.workDirCopy);
  removeWorkDirCopy(result.withoutSkill.workDirCopy);
}
