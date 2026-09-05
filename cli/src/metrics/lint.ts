import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";

const execAsync = promisify(exec);

interface EslintFileResult {
  errorCount?: number;
}

/**
 * Counts lint errors via ESLint, if an ESLint setup is detectable
 * (`eslint.config.*` or `.eslintrc*`). `0` if no setup is found or ESLint
 * isn't installed — not an error case, many projects use a different
 * linter whose integration will be added once there's real demand.
 */
export async function countLintErrors(workDir: string): Promise<number> {
  const hasEslintConfig = [
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
    ".eslintrc",
    ".eslintrc.json",
    ".eslintrc.js",
    ".eslintrc.cjs",
  ].some((f) => existsSync(join(workDir, f)));

  if (!hasEslintConfig) return 0;

  try {
    const { stdout } = await execAsync("npx --no-install eslint . --format json", {
      cwd: workDir,
      maxBuffer: 20 * 1024 * 1024,
    });
    return sum(stdout);
  } catch (err) {
    const e = err as { stdout?: string };
    if (typeof e.stdout === "string" && e.stdout.length > 0) {
      return sum(e.stdout);
    }
    return 0;
  }
}

function sum(stdout: string): number {
  try {
    const parsed = JSON.parse(stdout) as EslintFileResult[];
    return parsed.reduce((total, file) => total + (file.errorCount ?? 0), 0);
  } catch {
    return 0;
  }
}
