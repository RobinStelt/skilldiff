import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";

const execAsync = promisify(exec);

interface EslintFileResult {
  errorCount?: number;
}

/**
 * Zählt Lint-Fehler via ESLint, falls ein ESLint-Setup erkennbar ist
 * (`eslint.config.*` oder `.eslintrc*`). `0`, wenn kein Setup gefunden wird
 * oder ESLint nicht installiert ist — kein Fehlerfall, viele Projekte nutzen
 * andere Linter, deren Integration erst mit echtem Bedarf nachgezogen wird.
 */
export async function zaehleLintFehler(workDir: string): Promise<number> {
  const hatEslintConfig = [
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
    ".eslintrc",
    ".eslintrc.json",
    ".eslintrc.js",
    ".eslintrc.cjs",
  ].some((f) => existsSync(join(workDir, f)));

  if (!hatEslintConfig) return 0;

  try {
    const { stdout } = await execAsync("npx --no-install eslint . --format json", {
      cwd: workDir,
      maxBuffer: 20 * 1024 * 1024,
    });
    return summiere(stdout);
  } catch (err) {
    const e = err as { stdout?: string };
    if (typeof e.stdout === "string" && e.stdout.length > 0) {
      return summiere(e.stdout);
    }
    return 0;
  }
}

function summiere(stdout: string): number {
  try {
    const parsed = JSON.parse(stdout) as EslintFileResult[];
    return parsed.reduce((sum, file) => sum + (file.errorCount ?? 0), 0);
  } catch {
    return 0;
  }
}
