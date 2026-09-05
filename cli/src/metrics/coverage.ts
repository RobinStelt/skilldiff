import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface IstanbulSummary {
  total?: { lines?: { pct?: number }; statements?: { pct?: number } };
}

const KANDIDATEN_PFADE = [
  "coverage/coverage-summary.json",
  "coverage/coverage-final-summary.json",
];

/**
 * Liest Testabdeckung aus einem Istanbul/nyc-`coverage-summary.json`, falls
 * eines vom Prüfkommando erzeugt wurde. Liefert `0`, wenn keins gefunden
 * wird — das ist bewusst ein Platzhalter, kein "unbekannt" (das Schema
 * verlangt `test_coverage_pct: number`, keine `null`-Option). Nutzer, deren
 * Prüfkommando keinen Coverage-Report erzeugt, sollten eines mit
 * `--coverage`/vergleichbarem Flag angeben, sonst ist dieser Wert wenig
 * aussagekräftig.
 */
export function leseTestAbdeckung(workDir: string): number {
  for (const relPfad of KANDIDATEN_PFADE) {
    const pfad = join(workDir, relPfad);
    if (!existsSync(pfad)) continue;
    try {
      const parsed = JSON.parse(readFileSync(pfad, "utf-8")) as IstanbulSummary;
      const pct = parsed.total?.lines?.pct ?? parsed.total?.statements?.pct;
      if (typeof pct === "number") return pct;
    } catch {
      // unlesbarer/fremder Report-Aufbau -> weiter zum nächsten Kandidaten
    }
  }
  return 0;
}
