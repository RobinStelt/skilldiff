import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface IstanbulSummary {
  total?: { lines?: { pct?: number }; statements?: { pct?: number } };
}

const CANDIDATE_PATHS = [
  "coverage/coverage-summary.json",
  "coverage/coverage-final-summary.json",
];

/**
 * Reads test coverage from an Istanbul/nyc `coverage-summary.json`, if the
 * check command produced one. Returns `0` if none is found — that's
 * deliberately a placeholder, not "unknown" (the schema requires
 * `test_coverage_pct: number`, no `null` option). Users whose check command
 * doesn't produce a coverage report should add a `--coverage`/equivalent
 * flag, otherwise this value is of limited use.
 */
export function readTestCoverage(workDir: string): number {
  for (const relPath of CANDIDATE_PATHS) {
    const path = join(workDir, relPath);
    if (!existsSync(path)) continue;
    try {
      const parsed = JSON.parse(readFileSync(path, "utf-8")) as IstanbulSummary;
      const pct = parsed.total?.lines?.pct ?? parsed.total?.statements?.pct;
      if (typeof pct === "number") return pct;
    } catch {
      // unreadable/unfamiliar report shape -> try the next candidate
    }
  }
  return 0;
}
