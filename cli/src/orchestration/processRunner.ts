import { spawn } from "node:child_process";
import { platform } from "node:os";

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ProcessRunner {
  run(cmd: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }): Promise<ProcessResult>;
}

/**
 * Real process execution. Kept as an interface so orchestration and metric
 * collection can run against a fake runner in tests, instead of spawning
 * real `claude` sessions or build commands.
 */
export const realProcessRunner: ProcessRunner = {
  run(cmd, args, opts) {
    return new Promise((resolve, reject) => {
      // Same class of bug as isolation/claudeBinary.ts's `claude` fix:
      // detectCheckCommand.ts hands back plain commands like "npm"/"pytest"
      // (see src/category/detectCheckCommand.ts), and on Windows "npm" is
      // an npm-installed `.cmd` shim — `spawn("npm", ..., { shell: false })`
      // fails with ENOENT (found for real running Batch 2's playwright-skill
      // task, which auto-detects "npm test" as its check command). `go`/
      // `cargo`/real `.exe`s spawn identically either way, so this is safe
      // to apply unconditionally on win32 rather than special-casing npm.
      const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env, shell: platform() === "win32" });
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
