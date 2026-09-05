import { mkdtempSync, rmSync, mkdirSync, symlinkSync, existsSync, lstatSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Bedingung, LinkCapability } from "./types.js";
import type { IsolationTier } from "@marktplatz/schema";

export interface IsolatedHome {
  path: string;
  cleanup: () => void;
}

/**
 * Frisches, leeres $HOME/%USERPROFILE% pro Run.
 *
 * Notwendig, weil `--setting-sources project` allein NICHT ausreicht, um
 * global aktivierte Plugin-/Personal-Skills aus der Sicht des Modells
 * herauszuhalten (bestätigter Befund, LOKAL-PROTOKOLL.md, Test 1). Ohne
 * dieses frische Home wäre der A/B-Vergleich verunreinigt — der "ohne
 * Skill"-Lauf sähe unter Umständen trotzdem fremde Skills.
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
    // rmSync auf einen Symlink/eine Junction entfernt nur den Verweis
    // selbst, nicht rekursiv den Inhalt des Ziels — genau das wollen wir.
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
 * Setzt das projekt-lokale `.claude/skills/<skillId>`-Gate für Tier B.
 *
 * - `mit_skill`: verlinkt die Skill-Quelle (die physisch AUSSERHALB von
 *   `workDir` liegen muss, siehe Validierung im Aufrufer) ins projekt-lokale
 *   Skill-Verzeichnis.
 * - `ohne_skill`: stellt sicher, dass kein Link existiert.
 *
 * Nicht zuständig für Tier A (Container-Mounts) oder Tier C (keine
 * Garantie) — dafür gibt es keine Link-Operation.
 */
export function applyTierBGate(params: {
  workDir: string;
  skillId: string;
  skillSourceDir: string;
  bedingung: Bedingung;
  linkFaehigkeit: LinkCapability;
}): void {
  const { workDir, skillId, skillSourceDir, bedingung, linkFaehigkeit } = params;
  const linkPath = skillLinkPath(workDir, skillId);
  mkdirSync(join(workDir, ".claude", "skills"), { recursive: true });
  removeLinkIfPresent(linkPath);

  if (bedingung === "ohne_skill") {
    return;
  }

  if (linkFaehigkeit.symlink) {
    createSymlink(skillSourceDir, linkPath);
  } else if (linkFaehigkeit.junction) {
    createJunction(skillSourceDir, linkPath);
  } else {
    throw new Error(
      "applyTierBGate wurde für Tier B aufgerufen, aber weder Symlink noch Junction sind verfügbar — Tier-Erkennung ist inkonsistent mit dem tatsächlichen Zustand.",
    );
  }
}

/**
 * Prüft, dass die Skill-Quelle nicht im (für das Modell sichtbaren)
 * Arbeitsverzeichnisbaum liegt. Kein Blocker an sich, sondern eine
 * Voraussetzung, die vor dem Start eines Tier-B-Laufs erzwungen wird —
 * sonst bleibt die Quelle über Bash/Read lesbar, selbst wenn sie nicht
 * gegatet ist (LOKAL-PROTOKOLL.md, Test 4).
 */
export function assertSkillSourceOutsideWorkDir(workDir: string, skillSourceDir: string): void {
  const normalizedWork = join(workDir).toLowerCase();
  const normalizedSource = join(skillSourceDir).toLowerCase();
  if (normalizedSource === normalizedWork || normalizedSource.startsWith(normalizedWork + "\\") || normalizedSource.startsWith(normalizedWork + "/")) {
    throw new Error(
      `Skill-Quelle (${skillSourceDir}) liegt innerhalb des Arbeitsverzeichnisses (${workDir}). Für Tier B/A muss die Quelle physisch außerhalb liegen, sonst ist der Kontrolllauf kontaminierbar (siehe Plan Abschnitt 3.1, Test 4).`,
    );
  }
}

export function tierRequiresOutsideSourceCheck(tier: IsolationTier): boolean {
  return tier === "A" || tier === "B";
}
