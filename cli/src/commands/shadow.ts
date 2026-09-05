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
import { freshWorkDirCopy } from "../orchestration/runOrchestrator.js";
import { resolveClaudeBin } from "../isolation/claudeBinary.js";

export function shadowInstallCommand(options: { dir: string }): void {
  installShadowHooks(options.dir);
  console.log(pc.green(`✓ Shadow mode hooks installed in ${options.dir}/.claude/settings.json`));
  console.log(pc.dim('Register a skill to measure with: skill-ab watch add --skill <id> --source <path>'));
}

export function shadowUninstallCommand(options: { dir: string }): void {
  uninstallShadowHooks(options.dir);
  console.log(pc.green(`✓ Shadow mode hooks removed from ${options.dir}/.claude/settings.json`));
}

/**
 * Invoked BY Claude Code (registered via `shadow install`) on
 * UserPromptSubmit — never called directly by a user. Prints nothing on
 * purpose: this hook's stdout can influence Claude Code's own behavior
 * (per the hooks protocol), and shadow mode has nothing to say there.
 */
export function shadowUserPromptSubmitCommand(): void {
  const input = JSON.parse(readStdinSync()) as { session_id: string; prompt: string; cwd: string };
  const config = loadOrCreateConfig();
  handleUserPromptSubmit(input, {
    config,
    snapshot: (cwd) => freshWorkDirCopy(cwd, "shadow-before"),
    isSkillLinked,
    detectCheckCommand,
    endpointUrl: process.env.SKILL_AB_ENDPOINT ?? null,
    claudeBin: resolveClaudeBin(process.env.SKILL_AB_CLAUDE_BIN),
  });
}

/** Invoked BY Claude Code on Stop — never called directly by a user. */
export function shadowStopCommand(): void {
  const input = JSON.parse(readStdinSync()) as {
    session_id: string;
    transcript_path: string;
    stop_hook_active?: boolean;
  };
  handleStop(input, {
    extractUsage: extractLatestUsageFromTranscript,
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
