import { spawn } from "node:child_process";

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
      const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env, shell: false });
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
