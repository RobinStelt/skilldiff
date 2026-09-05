import type { Kategorie, Laufergebnis } from "@marktplatz/schema";
import { leseTestAbdeckung } from "./coverage.js";
import { zaehleLintFehler } from "./lint.js";
import { ermittleDiffGroesse, schaetzeZyklomatischeKomplexitaet } from "./complexity.js";
import { berechneLesbarkeitsScore } from "./readability.js";

function ciStatus(erfolg: boolean | null): "pass" | "fail" | "n/a" {
  if (erfolg === null) return "n/a";
  return erfolg ? "pass" : "fail";
}

interface BedingungsKontext {
  workDirKopie: string;
  laufergebnis: Laufergebnis;
}

/**
 * Baut `category_metrics` für EINE Bedingung (mit_skill ODER ohne_skill),
 * passend zur erkannten Kategorie (Plan Abschnitt 4, Tabelle). Rückgabe
 * `null` für marketing/sonstige — dort gibt es laut Schema kein
 * automatisiertes Signal.
 */
export async function ermittleKategorieMetrikenFuerBedingung(
  kategorie: Kategorie,
  originalWorkDir: string,
  bedingung: BedingungsKontext,
): Promise<Record<string, unknown> | null> {
  switch (kategorie) {
    case "debugging":
    case "feature":
      return {
        test_coverage_pct: leseTestAbdeckung(bedingung.workDirKopie),
        lint_errors: await zaehleLintFehler(bedingung.workDirKopie),
        ci_status: ciStatus(bedingung.laufergebnis.erfolg),
      };
    case "refactoring":
      return {
        cyclomatic_complexity_before: schaetzeZyklomatischeKomplexitaet(originalWorkDir),
        cyclomatic_complexity_after: schaetzeZyklomatischeKomplexitaet(bedingung.workDirKopie),
        diff_size_loc: await ermittleDiffGroesse(originalWorkDir, bedingung.workDirKopie),
      };
    case "doku":
      return { readability_score: berechneLesbarkeitsScore(bedingung.workDirKopie) };
    case "marketing":
    case "sonstige":
      return null;
  }
}
