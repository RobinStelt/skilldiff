import pc from "picocolors";
import { detectIsolationTier, assertSkillSourceOutsideWorkDir, tierRequiresOutsideSourceCheck } from "../isolation/index.js";
import { buildDockerRunArgs } from "../isolation/dockerRun.js";
import type { Invocation } from "../orchestration/runOrchestrator.js";
import { fuehreVergleichAus, cleanupWorkDirCopies } from "../orchestration/runOrchestrator.js";
import { realProcessRunner } from "../orchestration/processRunner.js";
import type { Bedingung } from "../isolation/types.js";
import { erkenneKategorie } from "../category/detectCategory.js";
import { bestimmeGroessenklasse } from "../category/sizeBucket.js";
import { ermittleSecurityDelta } from "../security/delta.js";
import { ermittleKategorieMetrikenFuerBedingung } from "../metrics/categoryMetrics.js";
import { ladeOderErzeugeConfig, istErsterLauf, markiereConsentGesehen } from "../config/localConfig.js";
import { zeigeConsentScreen } from "../consent/consentScreen.js";
import { zeigeLokalesDelta } from "../report/localReport.js";
import { sendeRunResult } from "../upload/submit.js";
import { buildRunResult } from "../buildRunResult.js";
import { ermittleClaudeVersion, ermittleCliBuildHash, ermittleCliVersion } from "../versionInfo.js";

export interface RunCommandOptions {
  skillId: string;
  workDir: string;
  skillSourceDir?: string;
  aufgabe: string;
  checkCommand?: string;
  claudeBin?: string;
  endpointUrl?: string;
  dockerImage?: string;
  apiKeyEnvVar?: string;
}

function parseCheckCommand(cmd?: string): { cmd: string; args: string[] } | null {
  if (!cmd) return null;
  const [bin, ...args] = cmd.split(" ").filter(Boolean);
  if (!bin) return null;
  return { cmd: bin, args };
}

export async function runCommand(options: RunCommandOptions): Promise<void> {
  const claudeBin = options.claudeBin ?? "claude";
  const checkCommand = parseCheckCommand(options.checkCommand);

  // --- 8. Consent-Screen: nur beim allerersten Lauf ---------------------
  let config = ladeOderErzeugeConfig();
  if (istErsterLauf(config)) {
    const entscheidung = await zeigeConsentScreen();
    config = markiereConsentGesehen(config, entscheidung);
    if (!entscheidung.standardConsentErteilt) {
      console.log(
        pc.yellow(
          "\nOhne Standard-Consent lädt dieses CLI nichts hoch. Du bekommst weiterhin dein lokales Delta angezeigt.",
        ),
      );
    }
  }

  // --- 2. Gestufte Kontrolllauf-Isolation: tatsächlich prüfen, nicht raten ---
  const tierErgebnis = await detectIsolationTier();
  console.log(pc.dim(`Isolationsstufe: ${tierErgebnis.tier} (${tierErgebnis.begruendung})`));

  if (tierRequiresOutsideSourceCheck(tierErgebnis.tier) && options.skillSourceDir) {
    assertSkillSourceOutsideWorkDir(options.workDir, options.skillSourceDir);
  }

  // --- 1. Run-Orchestrierung: baut den passenden Aufruf je nach Tier ----
  const buildInvocation = (bedingung: Bedingung, workDirKopie: string): Invocation => {
    const claudeArgs = ["-p", options.aufgabe, "--output-format", "json", "--setting-sources", "project"];

    if (tierErgebnis.tier === "A") {
      // Tier A wird als docker/podman-Wrapper um denselben claude-Aufruf gebaut.
      const runtime = tierErgebnis.dockerVerfuegbar ? "docker" : "podman";
      const args = buildDockerRunArgs({
        runtime,
        image: options.dockerImage ?? "skill-ab/claude-runner:latest",
        workDir: workDirKopie,
        skillSourceDir: bedingung === "mit_skill" ? options.skillSourceDir ?? null : null,
        skillId: options.skillId,
        bedingung,
        claudeInvocationArgs: [claudeBin, ...claudeArgs],
        apiKeyEnvVar: options.apiKeyEnvVar ?? "ANTHROPIC_API_KEY",
      });
      return { bin: runtime, args };
    }

    return { bin: claudeBin, args: claudeArgs };
  };

  console.log(pc.bold(`\nStarte Vergleichslauf für Skill "${options.skillId}" — Reihenfolge wird randomisiert...\n`));

  const ergebnis = await fuehreVergleichAus({
    runner: realProcessRunner,
    buildInvocation,
    originalWorkDir: options.workDir,
    skillId: options.skillId,
    skillSourceDir: options.skillSourceDir ?? null,
    tier: tierErgebnis.tier,
    linkFaehigkeit: tierErgebnis.linkFaehigkeit,
    checkCommand,
  });

  try {
    // --- 6. Kategoriespezifische Metriken + automatische Kategorieerkennung ---
    const kategorie = erkenneKategorie({ aufgabe: options.aufgabe, workDir: options.workDir });
    const sizeBucket = bestimmeGroessenklasse(options.workDir);

    const [mitSkillMetrics, ohneSkillMetrics, securityDelta] = await Promise.all([
      ermittleKategorieMetrikenFuerBedingung(kategorie, options.workDir, ergebnis.mitSkill),
      ermittleKategorieMetrikenFuerBedingung(kategorie, options.workDir, ergebnis.ohneSkill),
      ermittleSecurityDelta({
        kategorie,
        mitSkillDir: ergebnis.mitSkill.workDirKopie,
        ohneSkillDir: ergebnis.ohneSkill.workDirKopie,
      }),
    ]);

    // --- 7. Sofortiger lokaler Eigennutzen ---------------------------------
    zeigeLokalesDelta({
      skillId: options.skillId,
      mitSkill: ergebnis.mitSkill.laufergebnis,
      ohneSkill: ergebnis.ohneSkill.laufergebnis,
    });

    if (!config.standardConsentErteilt) {
      return; // kein Upload ohne Consent — lokaler Nutzen wurde bereits gezeigt.
    }

    // --- 4. Erzwungener Upload, kein Cherry-Picking ------------------------
    // Erst HIER, nach Abschluss BEIDER vollständigen Bedingungen, wird
    // überhaupt ein RunResult zusammengebaut. Ein Abbruch (Ctrl+C) vorher
    // hat diesen Punkt nie erreicht -> es wird nichts hochgeladen.
    const [claudeVersion, cliBuildHash] = await Promise.all([
      ermittleClaudeVersion(claudeBin),
      ermittleCliBuildHash(),
    ]);

    const runResult = buildRunResult({
      skillId: options.skillId,
      accountId: config.accountId,
      signingSecret: config.signingSecret,
      kategorie,
      sizeBucket,
      isolationTier: tierErgebnis.tier,
      mitSkillLaufergebnis: ergebnis.mitSkill.laufergebnis,
      ohneSkillLaufergebnis: ergebnis.ohneSkill.laufergebnis,
      securityDelta,
      mitSkillMetrics,
      ohneSkillMetrics,
      contentOptIn: config.contentOptIn,
      contentRef: null, // Klartext-Hosting für Blindvoting ist Phase-7-Thema, hier bewusst immer null
      reihenfolgeRandomisiert: ergebnis.reihenfolgeRandomisiert,
      claudeVersion,
      cliVersion: ermittleCliVersion(),
      cliBuildHash,
    });

    const uploadErgebnis = await sendeRunResult(runResult, { endpointUrl: options.endpointUrl ?? null });
    if (uploadErgebnis.ok) {
      console.log(pc.green(`✓ Ergebnis übertragen (${uploadErgebnis.modus}): ${uploadErgebnis.ziel}`));
    } else {
      console.error(pc.red("✗ Validierung/Upload fehlgeschlagen:"), uploadErgebnis.fehler);
      process.exitCode = 1;
    }
  } finally {
    cleanupWorkDirCopies(ergebnis);
  }
}
