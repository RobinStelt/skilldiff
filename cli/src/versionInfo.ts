import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getClaudeVersion(claudeBin: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(claudeBin, ["--version"], { windowsHide: true });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

export function getCliVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Build hash used to detect client tampering (plan section 7, residual
 * risk "client manipulation"). Prefers the Git commit hash of this CLI
 * checkout; falls back to a hash of the installed package.json when no Git
 * repo is present (e.g. an npm install without a .git folder).
 */
export async function getCliBuildHash(): Promise<string> {
  try {
    const { stdout } = await execAsync("git rev-parse HEAD", { cwd: __dirname });
    return stdout.trim();
  } catch {
    const pkgContent = readFileSync(join(__dirname, "..", "package.json"), "utf-8");
    return createHash("sha256").update(pkgContent).digest("hex").slice(0, 12);
  }
}
