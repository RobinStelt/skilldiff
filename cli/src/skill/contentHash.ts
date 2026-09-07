import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

function listFilesSorted(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (stat.isFile()) {
        out.push(relative(dir, full));
      }
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Deterministic content fingerprint (sha256, hex) for a skill source
 * directory — every file's relative path and content, in a stable sorted
 * order so directory-listing order never affects the result.
 *
 * This is the project's stand-in for a skill version number
 * (`schema/src/schema.ts`, `RunResult.skill_content_hash`): skill authors
 * can't be relied on to bump a version themselves, but the content itself
 * always changes when the skill does. Not a security mechanism (no
 * protection against a crafted collision) — just enough to notice, in
 * `skill-ab watch sync`, that a watched skill's content changed since it
 * was last registered.
 */
export function hashSkillSourceDir(skillSourceDir: string): string {
  const hash = createHash("sha256");
  for (const relPath of listFilesSorted(skillSourceDir)) {
    hash.update(relPath.split(sep).join("/"));
    hash.update("\0");
    hash.update(readFileSync(join(skillSourceDir, relPath)));
    hash.update("\0");
  }
  return hash.digest("hex");
}
