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
 * Echte Prozessausführung. Als Interface gehalten, damit Orchestrierung und
 * Metrik-Erfassung in Tests gegen einen Fake-Runner laufen können, statt
 * echte `claude`-Sessions oder Build-Kommandos auszuführen.
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
