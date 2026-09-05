import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SizeBucket } from "@marktplatz/schema";

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".venv", "__pycache__"]);

function countFiles(dir: string): number {
  let count = 0;
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
      } else {
        count += 1;
      }
    }
  }
  traverse(dir);
  return count;
}

/**
 * Automatically derived from the file count (plan section 4: "automatically
 * derived from file count/LOC"). File count only, no LOC counting — good
 * enough for a rough three-way split, and it stays language- and
 * encoding-independent (no need to read every file).
 */
export function determineSizeBucket(workDir: string): SizeBucket {
  const count = countFiles(workDir);
  if (count < 20) return "small";
  if (count < 150) return "medium";
  return "large";
}
