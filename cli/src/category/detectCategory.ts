import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import type { Category } from "@skilldiff/schema";

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".kt", ".rb", ".php", ".c", ".cpp", ".cs",
]);
const DOCS_EXTENSIONS = new Set([".md", ".mdx", ".rst", ".adoc", ".txt"]);

interface FileStats {
  codeFiles: number;
  docsFiles: number;
  totalFiles: number;
}

/** Counts file types in the project directory, skipping common build artifacts. */
function collectFileStats(dir: string, maxDepth = 6): FileStats {
  const ignoredDirs = new Set(["node_modules", ".git", "dist", "build", ".venv", "__pycache__"]);
  const stats: FileStats = { codeFiles: 0, docsFiles: 0, totalFiles: 0 };

  function traverse(current: string, depth: number): void {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignoredDirs.has(entry)) continue;
      const fullPath = join(current, entry);
      let info: ReturnType<typeof statSync>;
      try {
        info = statSync(fullPath);
      } catch {
        continue;
      }
      if (info.isDirectory()) {
        traverse(fullPath, depth + 1);
        continue;
      }
      stats.totalFiles += 1;
      const ext = extname(entry).toLowerCase();
      if (CODE_EXTENSIONS.has(ext)) stats.codeFiles += 1;
      if (DOCS_EXTENSIONS.has(ext)) stats.docsFiles += 1;
    }
  }

  traverse(dir, 0);
  return stats;
}

const DEBUGGING_KEYWORDS = /\b(bug|error|crash|fix(es|ed|ing)?|broken)\b/i;
const REFACTORING_KEYWORDS = /\b(refactor|restructure|simplify|clean\s*up)\b/i;
const DOCS_KEYWORDS = /\b(documentation|readme|docs?|explain|guide|tutorial)\b/i;
const MARKETING_KEYWORDS = /\b(marketing|ad\s*copy|copywriting|landing\s*page|slogan|campaign)\b/i;

/**
 * Automatic, heuristic category detection (briefing point 6 — not
 * manually enterable by the user). Combines keywords in the task
 * description with the file-type distribution in the target directory.
 *
 * Limits (deliberately documented, no claim of precision): a real
 * classification of "is this a bugfix or a feature?" would need more
 * signal than keywords + file extensions (e.g. test diffs, linked issues).
 * This heuristic is a first, transparent approximation — misclassified
 * runs are caught in aggregate by the category-heterogeneity check (plan
 * section 7), not corrected here.
 */
export function detectCategory(params: { task: string; workDir: string }): Category {
  const { task, workDir } = params;

  if (MARKETING_KEYWORDS.test(task)) return "marketing";
  if (DEBUGGING_KEYWORDS.test(task)) return "debugging";
  if (REFACTORING_KEYWORDS.test(task)) return "refactoring";
  if (DOCS_KEYWORDS.test(task)) return "docs";

  const stats = collectFileStats(workDir);
  if (stats.totalFiles === 0) return "other";

  const docsShare = stats.docsFiles / stats.totalFiles;
  if (docsShare > 0.6 && stats.codeFiles === 0) return "docs";
  if (stats.codeFiles > 0) return "feature";

  return "other";
}
