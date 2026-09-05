import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".rb", ".php", ".cs"]);
const IGNORIERTE_ORDNER = new Set(["node_modules", ".git", "dist", "build", ".venv", "__pycache__"]);

/** Zählt grobe Verzweigungs-Schlüsselwörter als Näherung an zyklomatische Komplexität. */
const ENTSCHEIDUNGSPUNKTE = /\b(if|else if|for|while|case|catch)\b|(\?\?|&&|\|\||\?)/g;

/**
 * Heuristische zyklomatische Komplexität, summiert über alle Quelldateien
 * im Verzeichnis: Basiswert 1 pro Datei + 1 pro gefundenem Entscheidungs-
 * punkt (if/else if/for/while/case/catch/&&/||/??/Ternary).
 *
 * Bewusst keine echte AST-basierte Berechnung (bräuchte pro Sprache einen
 * eigenen Parser, z.B. ts-morph für TS/JS, `radon` für Python — Aufwand für
 * eine spätere Phase). Diese Näherung reicht, um GROBE Unterschiede
 * vorher/nachher sichtbar zu machen, ist aber keine exakte Metrik — im
 * README entsprechend eingeordnet.
 */
export function schaetzeZyklomatischeKomplexitaet(dir: string): number {
  let summe = 0;

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
      if (!CODE_EXTENSIONS.has(extname(entry).toLowerCase())) continue;
      try {
        const inhalt = readFileSync(fullPath, "utf-8");
        const treffer = inhalt.match(ENTSCHEIDUNGSPUNKTE);
        summe += 1 + (treffer?.length ?? 0);
      } catch {
        // binäre/unlesbare Datei mit Code-Endung -> überspringen
      }
    }
  }

  traverse(dir);
  return summe;
}

/**
 * Diff-Größe in geänderten Zeilen zwischen zwei Verzeichnissen, ermittelt
 * über `git diff --no-index --shortstat` (nutzt Git ausschließlich als
 * Diff-Algorithmus, nicht als Repo-Voraussetzung — funktioniert auch,
 * wenn keins der beiden Verzeichnisse ein Git-Repo ist).
 */
export async function ermittleDiffGroesse(originalDir: string, geaendertDir: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `git diff --no-index --shortstat -- "${originalDir}" "${geaendertDir}"`,
      { maxBuffer: 20 * 1024 * 1024 },
    );
    return parseShortstat(stdout);
  } catch (err) {
    const e = err as { stdout?: string };
    // git diff --no-index beendet sich mit Exit-Code 1, wenn es Unterschiede
    // gibt — das ist der Normalfall hier, kein Fehler.
    if (typeof e.stdout === "string") {
      return parseShortstat(e.stdout);
    }
    return 0;
  }
}

function parseShortstat(stdout: string): number {
  const insertions = /(\d+) insertion/.exec(stdout);
  const deletions = /(\d+) deletion/.exec(stdout);
  return (insertions ? Number(insertions[1]) : 0) + (deletions ? Number(deletions[1]) : 0);
}
