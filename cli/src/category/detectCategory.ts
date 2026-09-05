import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import type { Kategorie } from "@marktplatz/schema";

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".kt", ".rb", ".php", ".c", ".cpp", ".cs",
]);
const DOKU_EXTENSIONS = new Set([".md", ".mdx", ".rst", ".adoc", ".txt"]);

interface DateiStatistik {
  codeDateien: number;
  dokuDateien: number;
  gesamtDateien: number;
}

/** Zählt Dateitypen im Projektverzeichnis, überspringt übliche Bauartefakte. */
function sammleDateiStatistik(dir: string, maxTiefe = 6): DateiStatistik {
  const ignorierteOrdner = new Set(["node_modules", ".git", "dist", "build", ".venv", "__pycache__"]);
  const stat: DateiStatistik = { codeDateien: 0, dokuDateien: 0, gesamtDateien: 0 };

  function traverse(current: string, tiefe: number): void {
    if (tiefe > maxTiefe) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignorierteOrdner.has(entry)) continue;
      const fullPath = join(current, entry);
      let info: ReturnType<typeof statSync>;
      try {
        info = statSync(fullPath);
      } catch {
        continue;
      }
      if (info.isDirectory()) {
        traverse(fullPath, tiefe + 1);
        continue;
      }
      stat.gesamtDateien += 1;
      const ext = extname(entry).toLowerCase();
      if (CODE_EXTENSIONS.has(ext)) stat.codeDateien += 1;
      if (DOKU_EXTENSIONS.has(ext)) stat.dokuDateien += 1;
    }
  }

  traverse(dir, 0);
  return stat;
}

const DEBUGGING_KEYWORDS = /\b(bug|fehler|crash|behebe|fix(e|en)?|kaputt|error)\b/i;
const REFACTORING_KEYWORDS = /\b(refactor|umbauen|vereinfache|aufr[äa]umen|clean\s*up|restructure)\b/i;
const DOKU_KEYWORDS = /\b(dokumentation|readme|docs?|erkl[äa]re|anleitung|tutorial)\b/i;
const MARKETING_KEYWORDS = /\b(marketing|werbetext|landingpage|copy(writing)?|slogan|kampagne)\b/i;

/**
 * Automatische, heuristische Kategorieerkennung (Briefing Punkt 6 — nicht
 * vom Nutzer manuell eintragbar). Kombiniert Stichworte in der Aufgaben-
 * beschreibung mit der Dateityp-Verteilung im Zielverzeichnis.
 *
 * Grenzen (bewusst dokumentiert, kein Anspruch auf Präzision): Eine echte
 * Klassifikation "ist das jetzt ein Bugfix oder ein Feature?" bräuchte
 * mehr Signal als Stichworte + Dateiendungen (z.B. Test-Diffs, verlinkte
 * Issues). Diese Heuristik ist eine erste, transparente Näherung — falsch
 * klassifizierte Runs sind über die Kategorie-Heterogenitäts-Prüfung
 * (Plan Abschnitt 7) im Aggregat abgefangen, nicht hier.
 */
export function erkenneKategorie(params: { aufgabe: string; workDir: string }): Kategorie {
  const { aufgabe, workDir } = params;

  if (MARKETING_KEYWORDS.test(aufgabe)) return "marketing";
  if (DEBUGGING_KEYWORDS.test(aufgabe)) return "debugging";
  if (REFACTORING_KEYWORDS.test(aufgabe)) return "refactoring";
  if (DOKU_KEYWORDS.test(aufgabe)) return "doku";

  const stat = sammleDateiStatistik(workDir);
  if (stat.gesamtDateien === 0) return "sonstige";

  const dokuAnteil = stat.dokuDateien / stat.gesamtDateien;
  if (dokuAnteil > 0.6 && stat.codeDateien === 0) return "doku";
  if (stat.codeDateien > 0) return "feature";

  return "sonstige";
}
