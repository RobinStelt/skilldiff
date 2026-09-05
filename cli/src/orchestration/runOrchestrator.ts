import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IsolationTier, Laufergebnis } from "@marktplatz/schema";
import type { LinkCapability, Bedingung } from "../isolation/types.js";
import { applyTierBGate, createIsolatedHome } from "../isolation/gating.js";
import { runCondition } from "./runCondition.js";
import type { ProcessRunner } from "./processRunner.js";
import { randomisiereReihenfolge } from "./randomize.js";

export interface Invocation {
  bin: string;
  args: string[];
}

export interface OrchestratorParams {
  runner: ProcessRunner;
  /**
   * Baut den tatsächlichen Aufruf für EINE Bedingung in EINEM Arbeits-
   * verzeichnis. Für Tier B/C üblicherweise ein direkter `claude`-Aufruf,
   * für Tier A ein `docker run ...`-Wrapper (siehe `isolation/dockerRun.ts`)
   * — der Orchestrator selbst kennt den Unterschied nicht, er ruft nur auf.
   */
  buildInvocation: (bedingung: Bedingung, workDirKopie: string) => Invocation;
  originalWorkDir: string;
  skillId: string;
  skillSourceDir: string | null;
  tier: IsolationTier;
  linkFaehigkeit: LinkCapability;
  checkCommand: { cmd: string; args: string[] } | null;
  rng?: () => number;
}

export interface ConditionOutcome {
  bedingung: Bedingung;
  laufergebnis: Laufergebnis;
  /** Frische Arbeitskopie, in der diese Bedingung gelaufen ist — Basis für Kategorie-/Security-Analyse danach. */
  workDirKopie: string;
}

export interface OrchestratorResult {
  reihenfolgeRandomisiert: boolean;
  mitSkill: ConditionOutcome;
  ohneSkill: ConditionOutcome;
}

/**
 * Kopiert das Original-Arbeitsverzeichnis in ein frisches Temp-Verzeichnis.
 *
 * Notwendig für "frische, voneinander isolierte Sessions — kein gemeinsamer
 * Kontext zwischen den beiden Bedingungen" (Briefing, Punkt 1): würden beide
 * Bedingungen im selben Verzeichnis laufen, könnten Dateiänderungen aus dem
 * ersten Lauf den zweiten beeinflussen, und die Reihenfolge würde das
 * Ergebnis verzerren statt nur die Anzeige.
 */
function frischeArbeitskopie(originalWorkDir: string, bedingung: Bedingung): string {
  const kopie = mkdtempSync(join(tmpdir(), `skill-ab-${bedingung}-`));
  cpSync(originalWorkDir, kopie, { recursive: true });
  return kopie;
}

async function fuehreBedingungAus(params: {
  o: OrchestratorParams;
  bedingung: Bedingung;
}): Promise<ConditionOutcome> {
  const { o, bedingung } = params;
  const workDirKopie = frischeArbeitskopie(o.originalWorkDir, bedingung);
  const isolatedHome = createIsolatedHome();

  try {
    if (o.tier === "B" && o.skillSourceDir) {
      applyTierBGate({
        workDir: workDirKopie,
        skillId: o.skillId,
        skillSourceDir: o.skillSourceDir,
        bedingung,
        linkFaehigkeit: o.linkFaehigkeit,
      });
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      HOME: isolatedHome.path,
      USERPROFILE: isolatedHome.path,
    };

    const invocation = o.buildInvocation(bedingung, workDirKopie);
    const laufergebnis = await runCondition({
      runner: o.runner,
      claudeBin: invocation.bin,
      claudeArgs: invocation.args,
      workDir: workDirKopie,
      env,
      checkCommand: o.checkCommand,
    });

    return { bedingung, laufergebnis, workDirKopie };
  } finally {
    isolatedHome.cleanup();
    // workDirKopie wird bewusst NICHT hier gelöscht — Kategorie-Erkennung
    // und Security-Scan laufen danach noch auf den Kopien. Aufräumen ist
    // Sache des Aufrufers (siehe cleanupWorkDirCopies).
  }
}

/**
 * Führt beide Bedingungen in randomisierter Reihenfolge aus. Genau 1
 * Durchlauf pro Bedingung (Briefing, Punkt 3) — kein Wiederholungszwang.
 */
export async function fuehreVergleichAus(o: OrchestratorParams): Promise<OrchestratorResult> {
  const reihenfolge = randomisiereReihenfolge(o.rng);

  const ergebnisErste = await fuehreBedingungAus({ o, bedingung: reihenfolge.erste });
  const ergebnisZweite = await fuehreBedingungAus({ o, bedingung: reihenfolge.zweite });

  const mitSkill = ergebnisErste.bedingung === "mit_skill" ? ergebnisErste : ergebnisZweite;
  const ohneSkill = ergebnisErste.bedingung === "ohne_skill" ? ergebnisErste : ergebnisZweite;

  return { reihenfolgeRandomisiert: reihenfolge.randomisiert, mitSkill, ohneSkill };
}

export function cleanupWorkDirCopies(result: OrchestratorResult): void {
  rmSync(result.mitSkill.workDirKopie, { recursive: true, force: true });
  rmSync(result.ohneSkill.workDirKopie, { recursive: true, force: true });
}
