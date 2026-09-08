import { appendFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { RunOutcome } from "@skilldiff/schema";
import { defaultConfigDir, loadOrCreateConfig } from "../config/localConfig.js";
import { loadShadowState, deleteShadowState, type ShadowState } from "./state.js";
import {
  detectIsolationTier,
  createIsolatedHome,
  applyTierBGate,
  assertSkillSourceOutsideWorkDir,
  tierRequiresOutsideSourceCheck,
  buildDockerRunArgs,
  type Condition,
} from "../isolation/index.js";
import { freshWorkDirCopy, type ConditionOutcome } from "../orchestration/runOrchestrator.js";
import { runCondition } from "../orchestration/runCondition.js";
import { realProcessRunner } from "../orchestration/processRunner.js";
import { detectCategory } from "../category/detectCategory.js";
import { determineSizeBucket } from "../category/sizeBucket.js";
import { determineSecurityDelta } from "../security/delta.js";
import { determineCategoryMetricsForCondition } from "../metrics/categoryMetrics.js";
import { buildRunResult } from "../buildRunResult.js";
import { submitRunResult } from "../upload/submit.js";
import { getClaudeVersion, getCliBuildHash, getCliVersion } from "../versionInfo.js";
import { hashSkillSourceDir } from "../skill/contentHash.js";

function log(message: string): void {
  try {
    mkdirSync(defaultConfigDir(), { recursive: true });
    appendFileSync(join(defaultConfigDir(), "shadow.log"), `[${new Date().toISOString()}] ${message}\n`, "utf-8");
  } catch {
    // Nobody is watching a detached background process's stdout — logging
    // is best-effort, never allowed to crash the worker.
  }
}

function opposite(condition: Condition): Condition {
  return condition === "with_skill" ? "without_skill" : "with_skill";
}

/**
 * Maps the (already-known) foreground outcome and the freshly-run
 * counterfactual outcome onto the "withSkill"/"withoutSkill" shape the
 * rest of the pipeline (category metrics, security delta, buildRunResult)
 * expects — pulled out as a pure function purely so this one piece of
 * shadow-mode-specific logic has a real unit test, unlike the I/O-heavy
 * rest of this file (same testing trade-off the project already makes for
 * runOrchestrator.ts — see cli/README.md).
 */
export function resolveConditionOutcomes(
  foregroundCondition: Condition,
  foreground: { runOutcome: RunOutcome; workDirCopy: string },
  counterfactual: { runOutcome: RunOutcome; workDirCopy: string },
): { withSkill: ConditionOutcome; withoutSkill: ConditionOutcome } {
  const foregroundEntry: ConditionOutcome = { condition: foregroundCondition, ...foreground };
  const counterfactualEntry: ConditionOutcome = { condition: opposite(foregroundCondition), ...counterfactual };
  return foregroundCondition === "with_skill"
    ? { withSkill: foregroundEntry, withoutSkill: counterfactualEntry }
    : { withSkill: counterfactualEntry, withoutSkill: foregroundEntry };
}

/**
 * The actual comparison work, run detached in the background (spawned by
 * handleStop, src/shadow/hooks.ts) so the user's real Stop event is never
 * delayed. NOT unit-tested beyond resolveConditionOutcomes above — it
 * spawns a real `claude` process, same as `run.ts`, and this project's
 * existing convention (cli/README.md) is that real end-to-end `claude`
 * runs are verified manually, not in the automated suite (would incur
 * real cost on every test run).
 */
export async function runShadowWorker(sessionId: string): Promise<void> {
  const state = loadShadowState(sessionId);
  if (!state || state.foregroundTokens === undefined || state.foregroundDurationSec === undefined) {
    log(`session ${sessionId}: no enriched state found, nothing to do`);
    return;
  }

  let counterfactualDirCopy: string | undefined;
  let isolatedHome: ReturnType<typeof createIsolatedHome> | undefined;

  try {
    const tierResult = await detectIsolationTier();
    const counterfactualCondition = opposite(state.foregroundCondition);
    counterfactualDirCopy = freshWorkDirCopy(state.beforeSnapshotDir, counterfactualCondition);
    isolatedHome = createIsolatedHome();

    if (tierRequiresOutsideSourceCheck(tierResult.tier)) {
      assertSkillSourceOutsideWorkDir(counterfactualDirCopy, state.skillSourceDir);
    }
    if (tierResult.tier === "B") {
      applyTierBGate({
        workDir: counterfactualDirCopy,
        skillId: state.skillId,
        skillSourceDir: state.skillSourceDir,
        condition: counterfactualCondition,
        linkCapability: tierResult.linkCapability,
      });
    }

    // See commands/run.ts's identical addition for why: without this, a
    // headless `claude -p` has no way to approve an Edit/Write tool call
    // (no TTY to prompt), so every real task silently can't get done in
    // either condition — safe here because `workDirCopy` is always this
    // run's disposable copy, never the user's real project.
    const claudeArgs = [
      "-p",
      state.task,
      "--output-format",
      "json",
      "--setting-sources",
      "project",
      "--permission-mode",
      "acceptEdits",
    ];
    const invocation =
      tierResult.tier === "A"
        ? {
            bin: tierResult.dockerAvailable ? "docker" : "podman",
            args: buildDockerRunArgs({
              runtime: tierResult.dockerAvailable ? "docker" : "podman",
              image: "skill-ab/claude-runner:latest",
              workDir: counterfactualDirCopy,
              skillSourceDir: counterfactualCondition === "with_skill" ? state.skillSourceDir : null,
              skillId: state.skillId,
              condition: counterfactualCondition,
              claudeInvocationArgs: [state.claudeBin, ...claudeArgs],
              apiKeyEnvVar: "ANTHROPIC_API_KEY",
            }),
          }
        : { bin: state.claudeBin, args: claudeArgs };

    const env: NodeJS.ProcessEnv = { ...process.env, HOME: isolatedHome.path, USERPROFILE: isolatedHome.path };
    const counterfactualOutcome = await runCondition({
      runner: realProcessRunner,
      claudeBin: invocation.bin,
      claudeArgs: invocation.args,
      workDir: counterfactualDirCopy,
      env,
      checkCommand: state.checkCommand,
    });

    // The foreground condition already really happened, live, in `cwd` —
    // only its success needs a post-hoc check (tokens/duration came from
    // handleStop, see hooks.ts). No isolation needed here: this is exactly
    // the directory the user was really working in, not a comparison copy.
    let foregroundSuccess: boolean | null = null;
    if (state.checkCommand) {
      const checkResult = await realProcessRunner.run(state.checkCommand.cmd, state.checkCommand.args, {
        cwd: state.cwd,
        env: process.env,
        useShell: true,
      });
      foregroundSuccess = checkResult.exitCode === 0;
    }
    const foregroundOutcome: RunOutcome = {
      success: foregroundSuccess,
      tokens: state.foregroundTokens,
      duration_sec: state.foregroundDurationSec,
    };

    const { withSkill, withoutSkill } = resolveConditionOutcomes(
      state.foregroundCondition,
      { runOutcome: foregroundOutcome, workDirCopy: state.cwd },
      { runOutcome: counterfactualOutcome, workDirCopy: counterfactualDirCopy },
    );

    const category = detectCategory({ task: state.task, workDir: state.beforeSnapshotDir });
    const sizeBucket = determineSizeBucket(state.beforeSnapshotDir);

    const [withSkillMetrics, withoutSkillMetrics, securityDelta] = await Promise.all([
      determineCategoryMetricsForCondition(category, state.beforeSnapshotDir, withSkill),
      determineCategoryMetricsForCondition(category, state.beforeSnapshotDir, withoutSkill),
      determineSecurityDelta({ category, withSkillDir: withSkill.workDirCopy, withoutSkillDir: withoutSkill.workDirCopy }),
    ]);

    const config = loadOrCreateConfig();
    if (!config.standardConsentGiven) {
      // Defense in depth — handleUserPromptSubmit already refuses to arm
      // without consent (see its doc comment), so this should be
      // unreachable in practice. Guards only the edge case of consent
      // being revoked between arming and this point. The counterfactual
      // claude call above already ran (arming already committed to it);
      // what must not happen regardless is the actual upload.
      log(`session ${sessionId}: consent not given, discarding without uploading`);
      return;
    }
    const [claudeVersion, cliBuildHash] = await Promise.all([
      getClaudeVersion(state.claudeBin),
      getCliBuildHash(),
    ]);

    // Hashed fresh here, not read from WatchedSkill.lastKnownHash — that
    // field is only as current as the last `watch add`/`watch sync`, while
    // this reflects exactly the content this turn's counterfactual run
    // actually used.
    const skillContentHash = hashSkillSourceDir(state.skillSourceDir);
    const runResult = buildRunResult({
      skillId: state.skillId,
      skillContentHash,
      accountId: config.accountId,
      signingSecret: config.signingSecret,
      category,
      sizeBucket,
      isolationTier: tierResult.tier,
      withSkillRunOutcome: withSkill.runOutcome,
      withoutSkillRunOutcome: withoutSkill.runOutcome,
      securityDelta,
      withSkillMetrics,
      withoutSkillMetrics,
      contentOptIn: config.contentOptIn,
      contentRef: null,
      // Shadow mode always runs foreground-then-background, never
      // randomized order — reported honestly as false, unlike `run`'s real
      // randomization (plan section 5's order-effect control does not
      // apply here, a real, disclosed limitation of this mode).
      orderRandomized: false,
      claudeVersion,
      cliVersion: getCliVersion(),
      cliBuildHash,
    });

    const uploadResult = await submitRunResult(runResult, {
      endpointUrl: state.endpointUrl,
      signingSecret: config.signingSecret,
    });
    log(
      uploadResult.ok
        ? `session ${sessionId}: uploaded run_id=${runResult.run_id} (${uploadResult.mode})`
        : `session ${sessionId}: upload failed: ${JSON.stringify(uploadResult.error)}`,
    );
  } catch (error) {
    log(`session ${sessionId}: FAILED — ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  } finally {
    if (counterfactualDirCopy) rmSync(counterfactualDirCopy, { recursive: true, force: true });
    rmSync(state.beforeSnapshotDir, { recursive: true, force: true });
    isolatedHome?.cleanup();
    deleteShadowState(sessionId);
  }
}
