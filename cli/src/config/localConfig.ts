import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";

export interface LocalConfig {
  /** Pseudonymous, long-term stable account ID (plan section 4). No email, no real name. */
  accountId: string;
  /** Local signing secret — never leaves this machine, only used to HMAC-sign before upload. */
  signingSecret: string;
  /** Has the one-time consent screen (standard consent, not content_opt_in) already been shown? */
  consentSeenAt: string | null;
  /** Decision from the one-time consent screen — persisted, not asked again per run. */
  standardConsentGiven: boolean;
  /** Separate, additional opt-in for community blind voting (plan section 4/8). */
  contentOptIn: boolean;
}

/** Default storage location. Kept as a function (not a module constant) so tests can pass their own `configDir`. */
export function defaultConfigDir(): string {
  return join(homedir(), ".skill-ab");
}

function configPath(configDir: string): string {
  return join(configDir, "config.json");
}

function createDefaultConfig(): LocalConfig {
  return {
    accountId: randomUUID(),
    signingSecret: randomBytes(32).toString("hex"),
    consentSeenAt: null,
    standardConsentGiven: false,
    contentOptIn: false,
  };
}

export function loadOrCreateConfig(configDir: string = defaultConfigDir()): LocalConfig {
  const path = configPath(configDir);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf-8")) as LocalConfig;
    } catch {
      // corrupt file -> create a fresh one instead of crashing
    }
  }
  const config = createDefaultConfig();
  saveConfig(config, configDir);
  return config;
}

export function saveConfig(config: LocalConfig, configDir: string = defaultConfigDir()): void {
  mkdirSync(configDir, { recursive: true });
  writeFileSync(configPath(configDir), JSON.stringify(config, null, 2), "utf-8");
}

export function isFirstRun(config: LocalConfig): boolean {
  return config.consentSeenAt === null;
}

export function markConsentSeen(
  config: LocalConfig,
  decision: { standardConsentGiven: boolean; contentOptIn: boolean },
  configDir: string = defaultConfigDir(),
): LocalConfig {
  const updated: LocalConfig = {
    ...config,
    consentSeenAt: new Date().toISOString(),
    standardConsentGiven: decision.standardConsentGiven,
    contentOptIn: decision.contentOptIn,
  };
  saveConfig(updated, configDir);
  return updated;
}
