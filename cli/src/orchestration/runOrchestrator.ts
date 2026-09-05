import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IsolationTier, RunOutcome } from "@marktplatz/schema";
import type { LinkCapability, Condition } from "../isolation/types.js";
import { applyTierBGate, createIsolatedHome } from "../isolation/gating.js";
import { runCondition } from "./runCondition.js";
import type { ProcessRunner } from "./processRunner.js";
import { randomizeOrder } from "./randomize.js";

export interface Invocation {
  bin: string;
  args: string[];
}

export interface OrchestratorParams {
  runner: ProcessRunner;
  /**
   * Builds the actual invocation for ONE condition in ONE working
   * directory. For Tier B/C this is usually a direct `claude` call, for
   * Tier A a `docker run ...` wrapper (see `isolation/dockerRun.ts`) — the
   * orchestrator itself doesn't know the difference, it just invokes.
   */
  buildInvocation: (condition: Condition, workDirCopy: string) => Invocation;
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
function freshWorkDirCopy(originalWorkDir: string, condition: Condition): string {
  const copy = mkdtempSync(join(tmpdir(), `skill-ab-${condition}-`));
  cpSync(originalWorkDir, copy, { recursive: true });
  return copy;
}

async function runOneCondition(params: {
  o: OrchestratorParams;
  condition: Condition;
}): Promise<ConditionOutcome> {
  const { o, condition } = params;
  const workDirCopy = freshWorkDirCopy(o.originalWorkDir, condition);
  const isolatedHome = createIsolatedHome();

  try {
    if (o.tier === "B" && o.skillSourceDir) {
      applyTierBGate({
        workDir: workDirCopy,
        skillId: o.skillId,
        skillSourceDir: o.skillSourceDir,
        condition,
        linkCapability: o.linkCapability,
      });
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      HOME: isolatedHome.path,
      USERPROFILE: isolatedHome.path,
    };

    const invocation = o.buildInvocation(condition, workDirCopy);
    const runOutcome = await runCondition({
      runner: o.runner,
      claudeBin: invocation.bin,
      claudeArgs: invocation.args,
      workDir: workDirCopy,
      env,
      checkCommand: o.checkCommand,
    });

    return { condition, runOutcome, workDirCopy };
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
  const secondResult = await runOneCondition({ o, condition: order.second });

  const withSkill = firstResult.condition === "with_skill" ? firstResult : secondResult;
  const withoutSkill = firstResult.condition === "without_skill" ? firstResult : secondResult;

  return { orderRandomized: order.randomized, withSkill, withoutSkill };
}

export function cleanupWorkDirCopies(result: OrchestratorResult): void {
  rmSync(result.withSkill.workDirCopy, { recursive: true, force: true });
  rmSync(result.withoutSkill.workDirCopy, { recursive: true, force: true });
}
