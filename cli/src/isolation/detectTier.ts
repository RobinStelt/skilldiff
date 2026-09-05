import { detectContainerRuntime } from "./dockerCheck.js";
import { detectLinkCapability } from "./linkCapability.js";
import type { TierDetectionResult } from "./types.js";

/**
 * Erkennt die tatsächlich verfügbare Isolationsstufe (Plan, Abschnitt 3.2).
 * Rät nichts — jede Stufe wird durch einen echten Funktionstest bestätigt:
 *
 * - Tier A: `docker info`/`podman info` läuft tatsächlich erfolgreich durch.
 * - Tier B: kein Container, aber ein echter Link-Mechanismus (Symlink oder,
 *   unter Windows ohne Developer Mode, NTFS-Junction) funktioniert
 *   nachweislich — verifiziert per Schreibtest, nicht per Plattform-Annahme
 *   (siehe skill-matching-hook/skill-gate-test/LOKAL-PROTOKOLL.md: `ln -s`
 *   schlägt auf gewöhnlichem Windows lautlos fehl, ohne Fehler zu werfen).
 * - Tier C: weder A noch B möglich → Best-Effort, niedrigste Vertrauensstufe.
 */
export async function detectIsolationTier(): Promise<TierDetectionResult> {
  const [containerRuntime, linkFaehigkeit] = await Promise.all([
    detectContainerRuntime(),
    Promise.resolve(detectLinkCapability()),
  ]);

  if (containerRuntime !== null) {
    return {
      tier: "A",
      begruendung: `${containerRuntime} info erfolgreich — Container-Isolation verfügbar`,
      dockerVerfuegbar: true,
      linkFaehigkeit,
    };
  }

  if (linkFaehigkeit.symlink || linkFaehigkeit.junction) {
    const mechanismus = linkFaehigkeit.symlink ? "Symlink" : "NTFS-Junction";
    return {
      tier: "B",
      begruendung: `Kein Container, aber ${mechanismus}-Gating funktioniert nachweislich`,
      dockerVerfuegbar: false,
      linkFaehigkeit,
    };
  }

  return {
    tier: "C",
    begruendung: "Weder Container noch funktionierender Link-Mechanismus verfügbar — Best-Effort",
    dockerVerfuegbar: false,
    linkFaehigkeit,
  };
}
