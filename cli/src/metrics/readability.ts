import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const DOCS_EXTENSIONS = new Set([".md", ".mdx", ".rst", ".adoc", ".txt"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build"]);

function collectDocsText(dir: string): string {
  const parts: string[] = [];

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
      if (DOCS_EXTENSIONS.has(extname(entry).toLowerCase())) {
        try {
          parts.push(readFileSync(fullPath, "utf-8"));
        } catch {
          // ignore
        }
      }
    }
  }

  traverse(dir);
  return parts.join("\n");
}

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length === 0) return 0;
  const vowelGroups = cleaned.match(/[aeiouy]+/g);
  return Math.max(1, vowelGroups?.length ?? 1);
}

/**
 * Readability score based on the Flesch Reading Ease formula:
 *
 *   206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
 *
 * Higher = easier to read. Syllable counting is a vowel-group heuristic,
 * not linguistically exact — consistent enough for a relative
 * before/after comparison (with vs. without skill), not meant as an
 * absolute truth.
 *
 * `0` if no evaluable text was found (no docs files or no sentences).
 */
export function computeReadabilityScore(workDir: string): number {
  const text = collectDocsText(workDir);
  const sentences = (text.match(/[.!?]+/g)?.length ?? 0) || 1;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;

  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
  const score = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
  return Math.round(score * 10) / 10;
}
