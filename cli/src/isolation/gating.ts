import { mkdtempSync, rmSync, mkdirSync, symlinkSync, existsSync, lstatSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import type { Condition, LinkCapability } from "./types.js";
import type { IsolationTier } from "@marktplatz/schema";

export interface IsolatedHome {
  path: string;
  cleanup: () => void;
}

/**
 * Copies ONLY the OAuth session token (`.claude/.credentials.json`) from
 * the real home into the fresh isolated one — confirmed necessary (real
 * run, real reproduction): Claude Code stores its Pro/Max subscription
 * login under `$HOME/.claude/.credentials.json`, so a blanked `$HOME`
 * leaves `claude` completely logged out ("Not logged in · Please run
 * /login", `is_error: true`, zero tokens/duration — silently looking like
 * a no-op run instead of an auth failure). Copying only this one file
 * keeps the actual isolation guarantee intact (no personal skills,
 * settings, or history leak in) while restoring subscription auth. A
 * missing file (e.g. API-key auth, or a platform that stores the session
 * elsewhere, like macOS Keychain) is a silent no-op, not an error — the
 * run then simply behaves as it did before this fix on that setup.
 */
function copyCredentialsIfPresent(realHomeDir: string, isolatedHomePath: string): void {
  const source = join(realHomeDir, ".claude", ".credentials.json");
  if (!existsSync(source)) return;
  const destDir = join(isolatedHomePath, ".claude");
  mkdirSync(destDir, { recursive: true });
  copyFileSync(source, join(destDir, ".credentials.json"));
}

/**
 * Fresh, empty $HOME/%USERPROFILE% per run (except for the one credentials
 * file copied in above).
 *
 * Necessary because `--setting-sources project` alone is NOT enough to
 * keep globally enabled plugin/personal skills out of the model's view
 * (confirmed finding, LOKAL-PROTOKOLL.md, test 1). Without this fresh home,
 * the A/B comparison would be contaminated — the "without skill" run could
 * still see foreign skills.
 *
 * `realHomeDir` is a parameter (not a hardcoded `homedir()` call) purely so
 * tests can point it at a fixture directory instead of the real user home.
 */
export function createIsolatedHome(realHomeDir: string = homedir()): IsolatedHome {
  const path = mkdtempSync(join(tmpdir(), "skill-ab-home-"));
  copyCredentialsIfPresent(realHomeDir, path);
  return {
    path,
    cleanup: () => rmSync(path, { recursive: true, force: true }),
  };
}

function skillLinkPath(workDir: string, skillId: string): string {
  return join(workDir, ".claude", "skills", skillId);
}

/**
 * Is `skillId` currently linked into `workDir` (project-level)? Used by
 * shadow mode (src/shadow/hooks.ts) to determine, without guessing, which
 * condition a real foreground turn actually represents — does NOT verify
 * the link points at any particular source, just that something is there.
 */
export function isSkillLinked(workDir: string, skillId: string): boolean {
  return existsSync(skillLinkPath(workDir, skillId));
}

function removeLinkIfPresent(linkPath: string): void {
  if (!existsSync(linkPath)) return;
  const stat = lstatSync(linkPath);
  if (stat.isSymbolicLink() || stat.isDirectory()) {
    // rmSync on a symlink/junction only removes the reference itself, not
    // recursively the target's content — which is exactly what we want.
    rmSync(linkPath, { recursive: false, force: true });
  }
}

function createSymlink(target: string, link: string): void {
  symlinkSync(target, link, "dir");
}

function createJunction(target: string, link: string): void {
  execFileSync("cmd.exe", ["/c", "mklink", "/J", link, target], {
    stdio: "ignore",
    windowsHide: true,
  });
}

/**
 * Sets the project-local `.claude/skills/<skillId>` gate for Tier B.
 *
 * - `with_skill`: links the skill source (which must live physically
 *   OUTSIDE `workDir`, see the caller's validation) into the project-local
 *   skills directory.
 * - `without_skill`: ensures no link exists.
 *
 * Not responsible for Tier A (container mounts) or Tier C (no guarantee) —
 * there's no link operation for those.
 */
export function applyTierBGate(params: {
  workDir: string;
  skillId: string;
  skillSourceDir: string;
  condition: Condition;
  linkCapability: LinkCapability;
}): void {
  const { workDir, skillId, skillSourceDir, condition, linkCapability } = params;
  const linkPath = skillLinkPath(workDir, skillId);
  mkdirSync(join(workDir, ".claude", "skills"), { recursive: true });
  removeLinkIfPresent(linkPath);

  if (condition === "without_skill") {
    return;
  }

  if (linkCapability.symlink) {
    createSymlink(skillSourceDir, linkPath);
  } else if (linkCapability.junction) {
    createJunction(skillSourceDir, linkPath);
  } else {
    throw new Error(
      "applyTierBGate was called for Tier B, but neither symlink nor junction is available — tier detection is inconsistent with the actual state.",
    );
  }
}

/**
 * Verifies that the skill source does not live within the (model-visible)
 * working directory tree. Not a blocker by itself, but a precondition
 * enforced before starting a Tier B run — otherwise the source stays
 * readable via Bash/Read even when not gated (LOKAL-PROTOKOLL.md, test 4).
 */
export function assertSkillSourceOutsideWorkDir(workDir: string, skillSourceDir: string): void {
  const normalizedWork = join(workDir).toLowerCase();
  const normalizedSource = join(skillSourceDir).toLowerCase();
  if (normalizedSource === normalizedWork || normalizedSource.startsWith(normalizedWork + "\\") || normalizedSource.startsWith(normalizedWork + "/")) {
    throw new Error(
      `Skill source (${skillSourceDir}) lies inside the working directory (${workDir}). For Tier A/B the source must live physically outside, otherwise the control run can be contaminated (see plan section 3.1, test 4).`,
    );
  }
}

export function tierRequiresOutsideSourceCheck(tier: IsolationTier): boolean {
  return tier === "A" || tier === "B";
}
