import prompts from "prompts";
import pc from "picocolors";

const UEBERTRAGENE_FELDER = [
  "skill_id, account_id (Pseudonym), signature",
  "category, size_bucket, isolation_tier",
  "mit_skill/ohne_skill: erfolg, tokens, dauer_sek",
  "security_delta (nur Anzahl pro Severity-Stufe, niemals der volle Scan-Report)",
  "category_metrics (kategoriespezifische Zahlen, nie Freitext)",
  "run_id, reihenfolge_randomisiert, timestamp, claude_version, cli_version, cli_build_hash",
];

export interface ConsentEntscheidung {
  standardConsentErteilt: boolean;
  contentOptIn: boolean;
}

/**
 * Zeigt den einmaligen Consent-Screen (nur beim allerersten Lauf, Briefing
 * Punkt 8). Zwei getrennte Fragen — Standard-Consent ist Voraussetzung fürs
 * Weiterlaufen, `content_opt_in` (Blindvoting-Content) ist ein bewusst
 * separates, ZUSÄTZLICHES Opt-in und wird nie automatisch mitbejaht.
 */
export async function zeigeConsentScreen(): Promise<ConsentEntscheidung> {
  console.log(pc.bold("\nSkill-A/B-Marktplatz — einmaliger Consent\n"));
  console.log("Nach jedem Vergleichslauf werden diese Felder automatisch übertragen:");
  for (const feld of UEBERTRAGENE_FELDER) {
    console.log(`  • ${feld}`);
  }
  console.log(
    pc.dim(
      "\nNiemals übertragen: Rohcode, Prompt-Inhalte, Dateiinhalte deines Projekts.\n",
    ),
  );

  const { standardConsentErteilt } = await prompts({
    type: "confirm",
    name: "standardConsentErteilt",
    message: "Diese Metadaten bei jedem Lauf automatisch übertragen?",
    initial: false,
  });

  console.log(
    pc.dim(
      "\nZusätzlich, GETRENNT vom obigen Consent: Community-Blindvoting (Phase 7)\n" +
        "möchte anonymisierte Output-Paare (dein tatsächlicher Text-/Code-Output)\n" +
        "vergleichen lassen. Das ist ein separates Opt-in, nicht in obigem enthalten.\n",
    ),
  );

  const { contentOptIn } = await prompts({
    type: "confirm",
    name: "contentOptIn",
    message: "Zusätzlich am Community-Blindvoting mit deinem Output teilnehmen (content_opt_in)?",
    initial: false,
  });

  return {
    standardConsentErteilt: Boolean(standardConsentErteilt),
    contentOptIn: Boolean(contentOptIn),
  };
}
