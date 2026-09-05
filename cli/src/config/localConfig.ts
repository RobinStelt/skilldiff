import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";

export interface LocalConfig {
  /** Pseudonyme, langfristig stabile Account-ID (Plan Abschnitt 4). Keine E-Mail, kein Klarname. */
  accountId: string;
  /** Lokaler Signierschlüssel — verlässt nie diesen Rechner, dient nur zum HMAC-Signieren vor Upload. */
  signingSecret: string;
  /** Wurde der einmalige Consent-Screen (Standard-Consent, nicht content_opt_in) bereits gezeigt? */
  consentGesehenAm: string | null;
  /** Entscheidung aus dem einmaligen Consent-Screen — persistiert, nicht pro Run erneut abgefragt. */
  standardConsentErteilt: boolean;
  /** Separates, zusätzliches Opt-in fürs Community-Blindvoting (Plan Abschnitt 4/8). */
  contentOptIn: boolean;
}

/** Standard-Speicherort. Als Funktion (nicht Modulkonstante), damit Tests einen eigenen `configDir` übergeben können. */
export function standardConfigDir(): string {
  return join(homedir(), ".skill-ab");
}

function configPfad(configDir: string): string {
  return join(configDir, "config.json");
}

function erzeugeStandardConfig(): LocalConfig {
  return {
    accountId: randomUUID(),
    signingSecret: randomBytes(32).toString("hex"),
    consentGesehenAm: null,
    standardConsentErteilt: false,
    contentOptIn: false,
  };
}

export function ladeOderErzeugeConfig(configDir: string = standardConfigDir()): LocalConfig {
  const pfad = configPfad(configDir);
  if (existsSync(pfad)) {
    try {
      return JSON.parse(readFileSync(pfad, "utf-8")) as LocalConfig;
    } catch {
      // korrupte Datei -> neu anlegen statt abzustürzen
    }
  }
  const config = erzeugeStandardConfig();
  speichereConfig(config, configDir);
  return config;
}

export function speichereConfig(config: LocalConfig, configDir: string = standardConfigDir()): void {
  mkdirSync(configDir, { recursive: true });
  writeFileSync(configPfad(configDir), JSON.stringify(config, null, 2), "utf-8");
}

export function istErsterLauf(config: LocalConfig): boolean {
  return config.consentGesehenAm === null;
}

export function markiereConsentGesehen(
  config: LocalConfig,
  entscheidung: { standardConsentErteilt: boolean; contentOptIn: boolean },
  configDir: string = standardConfigDir(),
): LocalConfig {
  const aktualisiert: LocalConfig = {
    ...config,
    consentGesehenAm: new Date().toISOString(),
    standardConsentErteilt: entscheidung.standardConsentErteilt,
    contentOptIn: entscheidung.contentOptIn,
  };
  speichereConfig(aktualisiert, configDir);
  return aktualisiert;
}
