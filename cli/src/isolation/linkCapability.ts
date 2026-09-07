import { mkdtempSync, rmSync, symlinkSync, mkdirSync, readlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import type { LinkCapability } from "./types.js";
import { toWindowsPath } from "./windowsPath.js";

/**
 * Actually tests (instead of guessing) whether real symlinks work.
 *
 * Background (LOKAL-PROTOKOLL.md in the skill-matching-hook project):
 * `fs.symlink`/`ln -s` does NOT fail with an error on a plain Windows
 * install without Developer Mode enabled — depending on the tool, it
 * silently creates an empty regular file instead. So a plain try/catch
 * around `symlinkSync` isn't enough — after the (supposed) creation we also
 * have to verify that a real symlink pointing at the target actually exists.
 */
export function probeSymlinkCapability(): boolean {
  const dir = mkdtempSync(join(tmpdir(), "skill-ab-symlink-probe-"));
  const target = join(dir, "target");
  const link = join(dir, "link");
  try {
    mkdirSync(target);
    // Deliberately "dir" instead of "junction": we want to force a REAL
    // symlink here, not a junction (which would succeed on Windows even
    // without Developer Mode and would give a false-positive result).
    symlinkSync(target, link, "dir");
    const resolved = readlinkSync(link);
    return resolved.length > 0;
  } catch {
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Probes NTFS junctions (Windows fallback for directories). Always `false`
 * on non-Windows platforms — there, real symlinks exist, so a junction
 * wouldn't be a meaningful fallback.
 */
export function probeJunctionCapability(): boolean {
  if (process.platform !== "win32") {
    return false;
  }
  const dir = mkdtempSync(join(tmpdir(), "skill-ab-junction-probe-"));
  const target = join(dir, "target");
  const link = join(dir, "link");
  try {
    mkdirSync(target);
    execFileSync("cmd.exe", ["/c", "mklink", "/J", toWindowsPath(link), toWindowsPath(target)], {
      stdio: "ignore",
      windowsHide: true,
    });
    const resolved = readlinkSync(link);
    return resolved.length > 0;
  } catch {
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function detectLinkCapability(): LinkCapability {
  return {
    symlink: probeSymlinkCapability(),
    junction: probeJunctionCapability(),
  };
}
