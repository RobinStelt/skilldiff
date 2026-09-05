import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SizeBucket } from "@marktplatz/schema";

const IGNORIERTE_ORDNER = new Set(["node_modules", ".git", "dist", "build", ".venv", "__pycache__"]);

function zaehleDateien(dir: string): number {
  let anzahl = 0;
  function traverse(current: string): void {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORIERTE_ORDNER.has(entry)) continue;
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
        anzahl += 1;
      }
    }
  }
  traverse(dir);
  return anzahl;
}

/**
 * Automatisch aus der Dateizahl abgeleitet (Plan Abschnitt 4: "automatisch
 * aus Dateizahl/LOC abgeleitet"). Nur Dateizahl, keine LOC-Zählung — für
 * eine grobe Drei-Stufen-Einteilung reicht das, und es bleibt sprach- und
 * encoding-unabhängig (keine Notwendigkeit, jede Datei einzulesen).
 */
export function bestimmeGroessenklasse(workDir: string): SizeBucket {
  const anzahl = zaehleDateien(workDir);
  if (anzahl < 20) return "klein";
  if (anzahl < 150) return "mittel";
  return "groß";
}
