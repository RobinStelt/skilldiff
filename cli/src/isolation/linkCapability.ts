import { mkdtempSync, rmSync, symlinkSync, mkdirSync, readlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import type { LinkCapability } from "./types.js";

/**
 * Probiert tatsächlich aus (statt zu raten), ob echte Symlinks funktionieren.
 *
 * Hintergrund (LOKAL-PROTOKOLL.md aus dem skill-matching-hook-Projekt):
 * `fs.symlink`/`ln -s` schlägt auf einer gewöhnlichen Windows-Installation
 * ohne aktivierten Developer Mode NICHT mit einem Fehler fehl, sondern
 * erzeugt je nach Werkzeug lautlos eine leere reguläre Datei. Deshalb reicht
 * ein try/catch um `symlinkSync` allein nicht — wir müssen nach dem
 * (vermeintlichen) Erstellen zusätzlich verifizieren, dass tatsächlich ein
 * Symlink entstanden ist, der auf das Ziel zeigt.
 */
export function probeSymlinkCapability(): boolean {
  const dir = mkdtempSync(join(tmpdir(), "skill-ab-symlink-probe-"));
  const target = join(dir, "target");
  const link = join(dir, "link");
  try {
    mkdirSync(target);
    // Bewusst "dir" statt "junction": wir wollen hier einen ECHTEN Symlink
    // erzwingen, keine Junction (die hätte auf Windows auch ohne Developer
    // Mode geklappt und würde das eigentliche Ergebnis verfälschen).
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
 * Probiert NTFS-Junctions (Windows-Fallback für Verzeichnisse). Auf
 * Nicht-Windows-Plattformen immer `false` — dort gibt es echte Symlinks,
 * eine Junction wäre kein sinnvoller zusätzlicher Fallback.
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
    execFileSync("cmd.exe", ["/c", "mklink", "/J", link, target], {
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
