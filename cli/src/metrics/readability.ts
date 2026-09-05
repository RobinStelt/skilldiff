import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const DOKU_EXTENSIONS = new Set([".md", ".mdx", ".rst", ".adoc", ".txt"]);
const IGNORIERTE_ORDNER = new Set(["node_modules", ".git", "dist", "build"]);

function sammleDokuText(dir: string): string {
  const teile: string[] = [];

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
        continue;
      }
      if (DOKU_EXTENSIONS.has(extname(entry).toLowerCase())) {
        try {
          teile.push(readFileSync(fullPath, "utf-8"));
        } catch {
          // ignorieren
        }
      }
    }
  }

  traverse(dir);
  return teile.join("\n");
}

function zaehleSilben(wort: string): number {
  const bereinigt = wort.toLowerCase().replace(/[^a-zäöüß]/g, "");
  if (bereinigt.length === 0) return 0;
  const vokalGruppen = bereinigt.match(/[aeiouyäöü]+/g);
  return Math.max(1, vokalGruppen?.length ?? 1);
}

/**
 * Lesbarkeits-Score nach dem Flesch-Reading-Ease-Prinzip, mit der für
 * deutsche Texte gebräuchlichen Formel (Amstad 1978):
 *
 *   206.835 - 1.015 * (Wörter/Sätze) - 84.6 * (Silben/Wörter)
 *
 * Höher = leichter lesbar. Silbenzählung ist eine Vokalgruppen-Heuristik,
 * keine linguistisch exakte Trennung — für einen relativen
 * Vorher/Nachher-Vergleich (mit vs. ohne Skill) ausreichend konsistent,
 * nicht gedacht als absolute Wahrheit.
 *
 * `0`, wenn kein auswertbarer Text (keine Doku-Dateien oder keine Sätze)
 * gefunden wurde.
 */
export function berechneLesbarkeitsScore(workDir: string): number {
  const text = sammleDokuText(workDir);
  const saetze = (text.match(/[.!?]+/g)?.length ?? 0) || 1;
  const woerter = text.split(/\s+/).filter((w) => w.length > 0);
  if (woerter.length === 0) return 0;

  const silben = woerter.reduce((sum, wort) => sum + zaehleSilben(wort), 0);
  const score = 206.835 - 1.015 * (woerter.length / saetze) - 84.6 * (silben / woerter.length);
  return Math.round(score * 10) / 10;
}
