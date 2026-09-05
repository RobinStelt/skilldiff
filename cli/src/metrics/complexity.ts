import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".rb", ".php", ".cs"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".venv", "__pycache__"]);

/** Counts rough branching keywords as an approximation of cyclomatic complexity. */
const DECISION_POINTS = /\b(if|else if|for|while|case|catch)\b|(\?\?|&&|\|\||\?)/g;

/**
 * Heuristic cyclomatic complexity, summed over every source file in the
 * directory: a base value of 1 per file + 1 per detected decision point
 * (if/else if/for/while/case/catch/&&/||/??/ternary).
 *
 * Deliberately not a real AST-based calculation (would need a per-language
 * parser, e.g. ts-morph for TS/JS, `radon` for Python — worth the effort in
 * a later phase). This approximation is enough to surface ROUGH
 * before/after differences, but it is not an exact metric — the README
 * calls this out explicitly.
 */
export function estimateCyclomaticComplexity(dir: string): number {
  let total = 0;

  function traverse(current: string): void {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry)) continue;
      const fullPath = join(current, entry);
      let info: ReturnType<typeof statSync>;
      try {
        info = statSync(fullPath);
      } catch {
        continue;
      }
      if (info.isDirectory()) {
        traverse(fullPath);
        continue;
      }
      if (!CODE_EXTENSIONS.has(extname(entry).toLowerCase())) continue;
      try {
        const content = readFileSync(fullPath, "utf-8");
        const matches = content.match(DECISION_POINTS);
        total += 1 + (matches?.length ?? 0);
      } catch {
        // binary/unreadable file with a code extension -> skip
      }
    }
  }

  traverse(dir);
  return total;
}

/**
 * Diff size in changed lines between two directories, computed via
 * `git diff --no-index --shortstat` (uses Git purely as a diff algorithm,
 * not as a repo requirement — works even if neither directory is a Git
 * repo).
 */
export async function computeDiffSize(originalDir: string, changedDir: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `git diff --no-index --shortstat -- "${originalDir}" "${changedDir}"`,
      { maxBuffer: 20 * 1024 * 1024 },
    );
    return parseShortstat(stdout);
  } catch (err) {
    const e = err as { stdout?: string };
    // git diff --no-index exits with code 1 when there are differences —
    // that's the normal case here, not an error.
    if (typeof e.stdout === "string") {
      return parseShortstat(e.stdout);
    }
    return 0;
  }
}

function parseShortstat(stdout: string): number {
  const insertions = /(\d+) insertion/.exec(stdout);
  const deletions = /(\d+) deletion/.exec(stdout);
  return (insertions ? Number(insertions[1]) : 0) + (deletions ? Number(deletions[1]) : 0);
}
