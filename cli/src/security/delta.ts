import type { Kategorie, SecurityDelta, SeverityCounts } from "@marktplatz/schema";
import { addiereSeverityCounts, leereSeverityCounts } from "./severityCounts.js";
import { scanMitBandit, scanMitNpmAudit, scanMitSemgrep } from "./scanners.js";

/** Code-nahe Kategorien, für die überhaupt gescannt wird (Plan Abschnitt 4). */
const CODE_NAHE_KATEGORIEN: ReadonlySet<Kategorie> = new Set(["debugging", "feature", "refactoring"]);

export function istScanRelevant(kategorie: Kategorie): boolean {
  return CODE_NAHE_KATEGORIEN.has(kategorie);
}

/**
 * Kombiniert alle zutreffenden Scanner (Semgrep sprachübergreifend als
 * Basis, npm audit/bandit als Ergänzung) zu einem Severity-Zählwert für
 * EIN Verzeichnis. Gleicher Scanner-Satz für "mit" und "ohne" zwingend
 * (Plan Abschnitt 5C) — deshalb wird diese Funktion für beide Bedingungen
 * identisch aufgerufen, nie unterschiedlich konfiguriert.
 */
export async function scanneVerzeichnis(dir: string): Promise<SeverityCounts> {
  const [semgrep, npmAudit, bandit] = await Promise.all([
    scanMitSemgrep(dir),
    scanMitNpmAudit(dir),
    scanMitBandit(dir),
  ]);
  return [semgrep, npmAudit, bandit].reduce(addiereSeverityCounts, leereSeverityCounts());
}

/**
 * Ermittelt `security_delta` für einen RunResult. `null`, wenn die
 * Kategorie nicht code-nah ist (marketing/doku/sonstige) — dort wird gar
 * nicht erst gescannt, nicht nur das Ergebnis verworfen.
 */
export async function ermittleSecurityDelta(params: {
  kategorie: Kategorie;
  mitSkillDir: string;
  ohneSkillDir: string;
}): Promise<SecurityDelta> {
  if (!istScanRelevant(params.kategorie)) {
    return null;
  }
  const [mit_skill, ohne_skill] = await Promise.all([
    scanneVerzeichnis(params.mitSkillDir),
    scanneVerzeichnis(params.ohneSkillDir),
  ]);
  return { mit_skill, ohne_skill };
}
