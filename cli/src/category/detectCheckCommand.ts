import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface CheckCommand {
  cmd: string;
  args: string[];
}

/**
 * npm's own placeholder for a project that was never given a real test
 * script — running it would "succeed" (exit 0) without checking anything,
 * which would make every run look like a false success. Treated the same
 * as "no test script at all".
 */
const NPM_PLACEHOLDER_TEST_SCRIPT = /^echo\s+"Error:\s+no test specified"\s+&&\s+exit\s+1$/;

function hasNpmTestScript(workDir: string): boolean {
  const pkgPath = join(workDir, "package.json");
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { scripts?: Record<string, string> };
    const testScript = pkg.scripts?.test;
    return typeof testScript === "string" && testScript.trim().length > 0 && !NPM_PLACEHOLDER_TEST_SCRIPT.test(testScript.trim());
  } catch {
    // Unreadable/invalid package.json -> can't tell, treat as "no script".
    return false;
  }
}

function hasPytestProject(workDir: string): boolean {
  if (existsSync(join(workDir, "pyproject.toml")) || existsSync(join(workDir, "pytest.ini")) || existsSync(join(workDir, "setup.cfg"))) {
    return true;
  }
  const testsDir = join(workDir, "tests");
  if (!existsSync(testsDir)) return false;
  try {
    return readdirSync(testsDir).some((name) => name.startsWith("test_") && name.endsWith(".py"));
  } catch {
    return false;
  }
}

/**
 * Best-effort auto-detection of a project's test/check command from
 * conventional marker files — the same "transparent heuristic, not exact"
 * spirit as detectCategory.ts and sizeBucket.ts. Used by `run` ONLY when
 * `--check` was not given explicitly; an explicit `--check` always wins.
 *
 * Deliberately conservative: returns `null` (no check, success stays
 * `null`) rather than guessing wrong and turning a broken run into a false
 * "succeeded" — a made-up passing check is worse than no check at all.
 * Order reflects likely project type for this ecosystem, not a ranking of
 * language popularity.
 */
export function detectCheckCommand(workDir: string): CheckCommand | null {
  if (hasNpmTestScript(workDir)) return { cmd: "npm", args: ["test"] };
  if (hasPytestProject(workDir)) return { cmd: "pytest", args: [] };
  if (existsSync(join(workDir, "go.mod"))) return { cmd: "go", args: ["test", "./..."] };
  if (existsSync(join(workDir, "Cargo.toml"))) return { cmd: "cargo", args: ["test"] };
  return null;
}
