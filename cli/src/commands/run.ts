import { readCodexDefaults, readCurrentCodexModel } from "../agents/codexModel.js";
import type { Agent, Execution } from "@skilldiff/schema";
import { parseAgent, resolveAgentBin, buildAgentArgs } from "../agents/adapter.js";
import pc from "picocolors";
import { detectIsolationTier, assertSkillSourceOutsideWorkDir, tierRequiresOutsideSourceCheck } from "../isolation/index.js";
import { buildDockerRunArgs } from "../isolation/dockerRun.js";
import type { Invocation } from "../orchestration/runOrchestrator.js";
import { runComparison, cleanupWorkDirCopies } from "../orchestration/runOrchestrator.js";
import { realProcessRunner } from "../orchestration/processRunner.js";
import type { Condition } from "../isolation/types.js";
import { detectCategory } from "../category/detectCategory.js";
import { determineSizeBucket } from "../category/sizeBucket.js";
import { detectCheckCommand } from "../category/detectCheckCommand.js";
import { determineSecurityDelta } from "../security/delta.js";
import { determineCategoryMetricsForCondition } from "../metrics/categoryMetrics.js";
import { loadOrCreateConfig, isFirstRun, markConsentSeen, pickRandomWatchedSkill } from "../config/localConfig.js";
import { showConsentScreen } from "../consent/consentScreen.js";
import { showLocalDelta } from "../report/localReport.js";
import { submitRunResult } from "../upload/submit.js";
import { buildRunResult } from "../buildRunResult.js";
import { getClaudeVersion, getCliBuildHash, getCliVersion } from "../versionInfo.js";
import { hashSkillSourceDir } from "../skill/contentHash.js";

export interface RunCommandOptions {
  /** Omit together with skillSourceDir to pick randomly from the watch list (`skill-ab watch add`) instead. */
  skillId?: string;
  workDir: string;
  skillSourceDir?: string;
  task: string;
  /** Omit to auto-detect from the project (detectCheckCommand.ts) — an explicit value always wins. */
  checkCommand?: string;
  claudeBin?: string;
  codexBin?: string;
  agent?: Agent;
  model?: string;
  reasoningEffort?: string;
  endpointUrl?: string;
  dockerImage?: string;
  apiKeyEnvVar?: string;
  /** See DetectIsolationTierOptions.skipContainer — forces Tier B/C even when Docker is running. */
  noDocker?: boolean;
}

function parseCheckCommand(cmd?: string): { cmd: string; args: string[] } | null {
  if (!cmd) return null;
  const [bin, ...args] = cmd.split(" ").filter(Boolean);
  if (!bin) return null;
  return { cmd: bin, args };
}

export async function runCommand(options: RunCommandOptions): Promise<void> {
  // --- 8. Consent screen: only on the very first run ---------------------
  let config = loadOrCreateConfig();
  const agent = parseAgent(options.agent ?? config.agent);
  const claudeBin = resolveAgentBin(agent, agent === "codex" ? options.codexBin ?? config.codexBinOverride ?? undefined : options.claudeBin ?? config.claudeBinOverride ?? undefined);
  const configuredModel = options.model ?? (agent === "codex" ? config.codexModel : config.claudeModel);
  const defaults = agent === "codex" && !configuredModel ? (readCurrentCodexModel() ?? await readCodexDefaults(claudeBin, options.workDir)) : null;
  const execution: Execution = {
    agent, model: configuredModel ?? defaults?.model ?? "unknown",
    agent_version: await getClaudeVersion(claudeBin),
    reasoning_effort: options.reasoningEffort ?? (agent === "codex" ? config.codexReasoningEffort ?? defaults?.effort ?? "medium" : null) ?? null,
  };
  buildAgentArgs(execution, options.task);
  console.log(`Agent: ${execution.agent} | Model: ${execution.model} | Reasoning: ${execution.reasoning_effort ?? "default"}`);

  const endpointUrl = options.endpointUrl ?? config.endpointUrl ?? null;
  if (isFirstRun(config)) {
    const decision = await showConsentScreen();
    config = markConsentSeen(config, decision);
    if (!decision.standardConsentGiven) {
      console.log(
        pc.yellow(
          "\nWithout standard consent, this CLI uploads nothing. You'll still see your local delta.",
        ),
      );
    }
  }

  // --- Resolve which skill to test: explicit flags win, otherwise pick ONE
  // at random from the watch list (never several — that would test a
  // bundle, not one skill's marginal effect). Lowers the "which skill do I
  // test today" decision cost for a user who normally has more than one
  // skill in use. ---------------------------------------------------------
  let skillId = options.skillId;
  let skillSourceDir = options.skillSourceDir;
  if (!skillId || !skillSourceDir) {
    const watched = pickRandomWatchedSkill(config, Math.random, agent);
    if (!watched) {
      throw new Error(
        "No --skill/--skill-source given, and no watched skills registered. " +
          'Either pass both flags, or run "skill-ab watch add --skill <id> --source <path>" once.',
      );
    }
    skillId = watched.skillId;
    skillSourceDir = watched.skillSourceDir;
    console.log(pc.dim(`No --skill given — picked "${skillId}" from your watch list.`));
  }
  if (!skillSourceDir) {
    // Unreachable in practice — the block above either has both flags
    // already or throws — but keeps the hashing below honest instead of
    // silently hashing `undefined`.
    throw new Error("Internal error: skillSourceDir was not resolved.");
  }
  const skillContentHash = hashSkillSourceDir(skillSourceDir);

  // Auto-detect a check command from the project when none was given
  // explicitly (detectCheckCommand.ts — same "transparent heuristic"
  // spirit as category/size-bucket detection). An explicit --check always
  // wins; omitting it no longer always means "no check", it means "try to
  // find one first".
  const checkCommand = options.checkCommand ? parseCheckCommand(options.checkCommand) : detectCheckCommand(options.workDir);
  if (!options.checkCommand && checkCommand) {
    console.log(pc.dim(`No --check given — auto-detected: ${checkCommand.cmd} ${checkCommand.args.join(" ")}`));
  }

  // --- 2. Tiered control-run isolation: actually checked, not guessed ----
  const tierResult = await detectIsolationTier({ skipContainer: options.noDocker || (agent === "codex" && !options.dockerImage) });
  console.log(pc.dim(`Isolation tier: ${tierResult.tier} (${tierResult.reason})`));

  if (tierRequiresOutsideSourceCheck(tierResult.tier) && skillSourceDir) {
    assertSkillSourceOutsideWorkDir(options.workDir, skillSourceDir);
  }

  // --- 1. Run orchestration: builds the right invocation per tier --------
  const buildInvocation = (condition: Condition, workDirCopy: string, codexHome?: string): Invocation => {
    const claudeArgs = buildAgentArgs(execution, options.task);

    if (tierResult.tier === "A") {
      // Tier A is built as a docker/podman wrapper around the same claude call.
      const runtime = tierResult.dockerAvailable ? "docker" : "podman";
      const args = buildDockerRunArgs({
        runtime,
        agent,
        codexHome,
        image: options.dockerImage ?? `skill-ab/${agent}-runner:latest`,
        workDir: workDirCopy,
        skillSourceDir: condition === "with_skill" ? skillSourceDir ?? null : null,
        skillId,
        condition,
        claudeInvocationArgs: [agent, ...claudeArgs],
        apiKeyEnvVar: options.apiKeyEnvVar ?? (agent === "codex" ? "CODEX_API_KEY" : "ANTHROPIC_API_KEY"),
      });
      return { bin: runtime, args };
    }

    return { bin: claudeBin, args: claudeArgs };
  };

  console.log(pc.bold(`\nStarting comparison run for skill "${skillId}" — order will be randomized...\n`));

  const result = await runComparison({
    runner: realProcessRunner,
    agent,
    execution: agent === "codex" ? execution : undefined,
    buildInvocation,
    originalWorkDir: options.workDir,
    skillId,
    skillSourceDir: skillSourceDir ?? null,
    tier: tierResult.tier,
    linkCapability: tierResult.linkCapability,
    checkCommand,
  });

  try {
    if (result.withSkill.execution) Object.assign(execution, result.withSkill.execution);
    // --- 6. Category-specific metrics + automatic category detection ----
    const category = detectCategory({ task: options.task, workDir: options.workDir });
    const sizeBucket = determineSizeBucket(options.workDir);

    const [withSkillMetrics, withoutSkillMetrics, securityDelta] = await Promise.all([
      determineCategoryMetricsForCondition(category, options.workDir, result.withSkill),
      determineCategoryMetricsForCondition(category, options.workDir, result.withoutSkill),
      determineSecurityDelta({
        category,
        withSkillDir: result.withSkill.workDirCopy,
        withoutSkillDir: result.withoutSkill.workDirCopy,
      }),
    ]);

    // --- 7. Immediate local benefit ----------------------------------------
    showLocalDelta({
      skillId,
      execution,
      withSkill: result.withSkill.runOutcome,
      withoutSkill: result.withoutSkill.runOutcome,
    });

    if (!config.standardConsentGiven) {
      return; // no upload without consent — local benefit was already shown.
    }

    // --- 4. Forced upload, no cherry-picking -------------------------------
    // Only HERE, after BOTH complete conditions are done, is a RunResult
    // even assembled. An interruption (Ctrl+C) before this point never
    // reached it -> nothing gets uploaded.
    const [claudeVersion, cliBuildHash] = await Promise.all([
      getClaudeVersion(claudeBin),
      getCliBuildHash(),
    ]);

    const runResult = buildRunResult({
      skillId,
      skillContentHash,
      accountId: config.accountId,
      signingSecret: config.signingSecret,
      category,
      sizeBucket,
      isolationTier: tierResult.tier,
      withSkillRunOutcome: result.withSkill.runOutcome,
      withoutSkillRunOutcome: result.withoutSkill.runOutcome,
      securityDelta,
      withSkillMetrics,
      withoutSkillMetrics,
      contentOptIn: config.contentOptIn,
      contentRef: null, // plain-text hosting for blind voting is a Phase 7 topic, deliberately always null here
      orderRandomized: result.orderRandomized,
      claudeVersion: agent === "claude" ? claudeVersion : undefined,
      execution,
      cliVersion: getCliVersion(),
      cliBuildHash,
    });

    const uploadResult = await submitRunResult(runResult, {
      endpointUrl,
      signingSecret: config.signingSecret,
    });
    if (uploadResult.ok) {
      console.log(pc.green(`✓ Result transmitted (${uploadResult.mode}): ${uploadResult.target}`));
    } else {
      console.error(pc.red("✗ Validation/upload failed:"), uploadResult.error);
      process.exitCode = 1;
    }
  } finally {
    cleanupWorkDirCopies(result);
  }
}
