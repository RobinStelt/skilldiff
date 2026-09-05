import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";

/**
 * Real, reproducible bug found while dogfooding shadow mode on Windows:
 * `child_process.spawn("claude", ..., { shell: false })` fails with ENOENT
 * — Node's non-shell spawn does not resolve the npm-installed `claude`
 * command to its `.cmd` shim (and even given the `.cmd` path directly,
 * spawning it with `shell: false` fails with EINVAL — Windows can't
 * execute a `.cmd` file as a native image). This affects `run`'s default
 * `--claude-bin claude` AND shadow mode's `SKILL_AB_CLAUDE_BIN` fallback
 * equally.
 *
 * Real fix: the Claude Desktop app ships a genuine `claude.exe` (not a
 * shim) under a versioned directory in the user's local app data. When no
 * explicit binary is given, look for that first — spawnable directly,
 * `shell: false` and all — before falling back to the bare `"claude"`
 * name (which still works fine as-is on macOS/Linux, where the
 * npm-installed binary is a real executable script, not a `.cmd` shim).
 */
function findWindowsClaudeExe(): string | null {
  const packagesDir = join(homedir(), "AppData", "Local", "Packages");
  if (!existsSync(packagesDir)) return null;

  let packageDirs: string[];
  try {
    packageDirs = readdirSync(packagesDir).filter((name) => name.toLowerCase().startsWith("claude_"));
  } catch {
    return null;
  }

  for (const packageDir of packageDirs) {
    const claudeCodeDir = join(packagesDir, packageDir, "LocalCache", "Roaming", "Claude", "claude-code");
    if (!existsSync(claudeCodeDir)) continue;

    let versions: string[];
    try {
      versions = readdirSync(claudeCodeDir).filter((name) => existsSync(join(claudeCodeDir, name, "claude.exe")));
    } catch {
      continue;
    }
    if (versions.length === 0) continue;

    // Highest version directory wins — sorted as plain strings is good
    // enough here (versions are consistently "major.minor.patch").
    versions.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
    const exePath = join(claudeCodeDir, versions[0]!, "claude.exe");
    try {
      if (statSync(exePath).isFile()) return exePath;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Resolves what to actually pass to `spawn()` for the `claude` binary.
 * `explicit` (an explicit `--claude-bin` flag or `SKILL_AB_CLAUDE_BIN`)
 * always wins. Otherwise: on Windows, try the real `claude.exe` described
 * above; everywhere else (and if that search finds nothing), fall back to
 * the bare `"claude"` command exactly as before.
 */
export function resolveClaudeBin(explicit?: string): string {
  if (explicit) return explicit;
  if (platform() === "win32") {
    const found = findWindowsClaudeExe();
    if (found) return found;
  }
  return "claude";
}
