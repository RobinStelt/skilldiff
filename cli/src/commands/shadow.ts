import type { Agent } from "@skilldiff/schema";
import { parseAgent, resolveAgentBin } from "../agents/adapter.js";
import { readCodexSnapshot } from "../shadow/codexTranscript.js";
import { loadShadowState, saveShadowState, deleteShadowState } from "../shadow/state.js";
import { spawn } from "node:child_process";
import pc from "picocolors";
import { installShadowHooks, uninstallShadowHooks } from "../shadow/install.js";
import { handleUserPromptSubmit, handleStop } from "../shadow/hooks.js";
import { readStdinSync } from "../shadow/readStdin.js";
import { extractLatestUsageFromTranscript } from "../shadow/transcriptUsage.js";
import { runShadowWorker } from "../shadow/worker.js";
import { loadOrCreateConfig } from "../config/localConfig.js";
import { isSkillLinked } from "../isolation/index.js";
import { detectCheckCommand } from "../category/detectCheckCommand.js";
import { freshWorkDirCopy, removeWorkDirCopy } from "../orchestration/runOrchestrator.js";

export function shadowInstallCommand(options: { dir: string; agent?: Agent }): void {
  installShadowHooks(options.dir, parseAgent(options.agent));
  console.log(pc.green(`✓ Shadow mode hooks installed in ${options.dir}/${options.agent === "codex" ? ".codex/hooks.json" : ".claude/settings.json"}`));
  console.log(pc.dim('Register a skill to measure with: skill-ab watch add --skill <id> --source <path>'));
}

export function shadowUninstallCommand(options: { dir: string; agent?: Agent }): void {
  uninstallShadowHooks(options.dir, parseAgent(options.agent));
  console.log(pc.green(`✓ Shadow mode hooks removed from ${options.dir}/${options.agent === "codex" ? ".codex/hooks.json" : ".claude/settings.json"}`));
}

/**
 * Invoked BY Claude Code (registered via `shadow install`) on
 * UserPromptSubmit — never called directly by a user. Prints nothing on
 * purpose: this hook's stdout can influence Claude Code's own behavior
 * (per the hooks protocol), and shadow mode has nothing to say there.
 */
export function shadowUserPromptSubmitCommand(agent: Agent = "claude"): void {
  if (process.env.SKILL_AB_INTERNAL_RUN) return;
  const input = JSON.parse(readStdinSync()) as { session_id: string; prompt: string; cwd: string; model?: string; transcript_path?: string; turn_id?: string };
  if (agent === "codex" && input.turn_id) input.session_id = `${input.session_id}-${input.turn_id}`;
  const config = loadOrCreateConfig();
  const baseline = agent === "codex" ? readCodexSnapshot(input.transcript_path ?? null) : null;
  // Without a measured baseline, a cumulative total could include previous turns.
  if (agent === "codex" && (!baseline || !input.model || !input.turn_id)) return;
  handleUserPromptSubmit(input, {
    config,
    snapshot: (cwd) => freshWorkDirCopy(cwd, "shadow-before"),
    isSkillLinked: (cwd, skillId) => isSkillLinked(cwd, skillId, agent),
    detectCheckCommand,
    // Persisted config ("skill-ab config set endpoint/claude-bin") is what
    // makes shadow mode actually durable across restarts/days — an env var
    // only lives as long as whatever set it in the environment, which a
    // hook process spawned by Claude Code long after setup generally
    // isn't. SKILL_AB_ENDPOINT/SKILL_AB_CLAUDE_BIN still work as an
    // explicit override for anyone who does want to set it that way.
    endpointUrl: process.env.SKILL_AB_ENDPOINT ?? config.endpointUrl ?? null,
    claudeBin: resolveAgentBin(agent, agent === "codex" ? config.codexBinOverride ?? undefined : process.env.SKILL_AB_CLAUDE_BIN ?? config.claudeBinOverride ?? undefined),
    execution: agent === "codex" ? { agent, model: input.model!, agent_version: "unknown", reasoning_effort: null } : undefined,
    foregroundTokenBaseline: baseline?.tokens,
    turnId: input.turn_id,
  });
}

/** Invoked BY Claude Code on Stop — never called directly by a user. */
export function shadowStopCommand(agent: Agent = "claude"): void {
  if (process.env.SKILL_AB_INTERNAL_RUN) return;
  const input = JSON.parse(readStdinSync()) as {
    session_id: string;
    transcript_path: string;
    stop_hook_active?: boolean;
    turn_id?: string;
    model?: string;
  };
  if (input.stop_hook_active) return;
  if (agent === "codex" && input.turn_id) input.session_id = `${input.session_id}-${input.turn_id}`;
  let codexTokens: number | null = null;
  if (agent === "codex") {
    const state = loadShadowState(input.session_id);
    const snapshot = readCodexSnapshot(input.transcript_path);
    if (!state?.execution || state.foregroundTokenBaseline === undefined || !snapshot || !snapshot.effort ||
        state.turnId !== input.turn_id || snapshot.turnId !== input.turn_id || snapshot.model !== state.execution.model ||
        (input.model && input.model !== state.execution.model) || snapshot.tokens <= state.foregroundTokenBaseline) {
      if (state) removeWorkDirCopy(state.beforeSnapshotDir);
      deleteShadowState(input.session_id); return;
    }
    codexTokens = snapshot.tokens - state.foregroundTokenBaseline;
    saveShadowState({ ...state, foregroundSnapshotDir: freshWorkDirCopy(state.cwd, "shadow-after"), execution: { ...state.execution, reasoning_effort: snapshot.effort } });
  }
  handleStop(input, {
    extractUsage: agent === "codex" ? () => codexTokens : extractLatestUsageFromTranscript,
    spawnWorker: (sessionId) => {
      // Detached: the Stop hook must return immediately, not wait for the
      // counterfactual claude call. Requires "skill-ab" on PATH (same
      // prerequisite as the hook commands themselves, see
      // src/shadow/install.ts). `shell: true` here (unlike the `claude`
      // invocation inside the worker itself) — this spawns by bare command
      // name, so it needs the shell's own PATH+extension resolution to
      // find an npm-installed `.cmd` shim on Windows, exactly the class of
      // problem `resolveClaudeBin` works around for `claude` specifically.
      const child = spawn("skill-ab", ["shadow", "worker-run", sessionId], {
        detached: true,
        stdio: "ignore",
        shell: true,
        windowsHide: true,
      });
      // A spawn failure (e.g. "skill-ab" not on PATH) emits an async
      // 'error' event — without a handler, Node treats that as an
      // uncaught exception and crashes this whole (short-lived, hook)
      // process. Swallow it: the Stop hook already returned "spawned" by
      // the time this could fire, and there's nothing left to report to.
      child.on("error", () => {});
      child.unref();
    },
  });
}

/** Spawned detached by shadowStopCommand — does the actual comparison work. */
export async function shadowWorkerRunCommand(sessionId: string): Promise<void> {
  await runShadowWorker(sessionId);
}
