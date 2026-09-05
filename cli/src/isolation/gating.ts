import { mkdtempSync, rmSync, mkdirSync, symlinkSync, existsSync, lstatSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Condition, LinkCapability } from "./types.js";
import type { IsolationTier } from "@marktplatz/schema";

export interface IsolatedHome {
  path: string;
  cleanup: () => void;
}

/**
 * Fresh, empty $HOME/%USERPROFILE% per run.
 *
 * Necessary because `--setting-sources project` alone is NOT enough to
 * keep globally enabled plugin/personal skills out of the model's view
 * (confirmed finding, LOKAL-PROTOKOLL.md, test 1). Without this fresh home,
 * the A/B comparison would be contaminated — the "without skill" run could
 * still see foreign skills.
 */
export function createIsolatedHome(): IsolatedHome {
  const path = mkdtempSync(join(tmpdir(), "skill-ab-home-"));
  return {
    path,
    cleanup: () => rmSync(path, { recursive: true, force: true }),
  };
}

function skillLinkPath(workDir: string, skillId: string): string {
  return join(workDir, ".claude", "skills", skillId);
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
