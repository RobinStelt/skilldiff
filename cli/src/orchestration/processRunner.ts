import { spawn } from "node:child_process";
import { platform } from "node:os";

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  /**
   * Opt-in per call, not a global platform switch — see the comment below
   * for why this runner got burned twice trying to make one blanket rule
   * cover both callers. Default false (matches `claude`, which is always
   * a fully resolved absolute path and needs no shell at all).
   */
  useShell?: boolean;
}

export interface ProcessRunner {
  run(cmd: string, args: string[], opts: RunOptions): Promise<ProcessResult>;
}

/**
 * Two real, sequentially-discovered bugs living in the same spot, which
 * is why `useShell` is now an explicit per-call opt-in instead of a
 * platform-wide default:
 *
 * 1. `spawn("npm", ["test"], { shell: false })` fails with ENOENT on
 *    Windows — "npm" is an npm-installed `.cmd` shim, and Node's non-
 *    shell spawn won't resolve it (found running Batch 2's
 *    playwright-skill task, whose auto-detected check command is
 *    "npm test"). Needs `shell: true` to resolve via PATH/PATHEXT.
 *
 * 2. Applying that same `shell: true` unconditionally to EVERY call —
 *    including `claude -p "<the task description>"` — broke the task
 *    argument itself: `spawn(cmd, args, { shell: true })` on Windows does
 *    NOT quote `args`, it just joins `[cmd, ...args]` with plain spaces
 *    before handing the line to `cmd.exe`, so a multi-word task got split
 *    into several separate tokens. Diagnosed from the raw `claude
 *    --output-format json` output: `result` was literally "I don't have
 *    any context for what needs fixing... no file, error, or diff
 *    mentioned yet" despite a normal `--task` string in code. Tried
 *    fixing this by quoting every argument before joining instead of
 *    scoping `shell: true` away from the `claude` call — that recovered
 *    the task text, but then broke `npm` resolution a DIFFERENT way: a
 *    quoted `"npm"` resolves to a stray `node_modules/npm` lookup
 *    relative to the working directory instead of the real global `npm`,
 *    at least on this Node version — reproduced directly, unquoted
 *    `"npm"` doesn't have this problem.
 *
 * So: `shell: true` stays opt-in, per call, unquoted — used only for the
 * known-simple, always-space-free check commands (`npm`, `pytest`, `go`,
 * `cargo`, see category/detectCheckCommand.ts) it was written for. The
 * `claude` call never sets it, sidestepping cmd.exe's quoting rules
 * entirely rather than trying to out-clever them a second time.
 */
export const realProcessRunner: ProcessRunner = {
  run(cmd, args, opts) {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, {
        cwd: opts.cwd,
        env: opts.env,
        shell: Boolean(opts.useShell) && platform() === "win32",
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk) => (stdout += chunk.toString()));
      child.stderr?.on("data", (chunk) => (stderr += chunk.toString()));
      child.on("error", reject);
      child.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code ?? -1 });
      });
    });
  },
};
