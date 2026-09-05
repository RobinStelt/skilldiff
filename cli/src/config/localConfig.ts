import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";

export interface WatchedSkill {
  skillId: string;
  /** Must live outside any --dir used with `run` (Tier A/B requirement, same as --skill-source). */
  skillSourceDir: string;
}

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
  /**
   * Skills registered via `skill-ab watch add` — lets `run` be called
   * without `--skill`/`--skill-source` every time. When several are
   * registered, `run` picks ONE at random per invocation (never several at
   * once — that would test a bundle, not one skill's marginal effect,
   * plan section 4/5). Lowers the "which skill do I test right now"
   * decision cost for a user who has more than one skill in normal use.
   */
  watchedSkills: WatchedSkill[];
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
    watchedSkills: [],
  };
}

export function loadOrCreateConfig(configDir: string = defaultConfigDir()): LocalConfig {
  const path = configPath(configDir);
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf-8")) as Partial<LocalConfig>;
      // watchedSkills was added after the first release — fill it in for a
      // config.json written before this field existed, instead of crashing
      // on config.watchedSkills.length elsewhere.
      return { watchedSkills: [], ...parsed } as LocalConfig;
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

/** Adds or replaces (by skillId) a watched skill. */
export function addWatchedSkill(
  config: LocalConfig,
  skill: WatchedSkill,
  configDir: string = defaultConfigDir(),
): LocalConfig {
  const updated: LocalConfig = {
    ...config,
    watchedSkills: [...config.watchedSkills.filter((s) => s.skillId !== skill.skillId), skill],
  };
  saveConfig(updated, configDir);
  return updated;
}

export function removeWatchedSkill(
  config: LocalConfig,
  skillId: string,
  configDir: string = defaultConfigDir(),
): LocalConfig {
  const updated: LocalConfig = {
    ...config,
    watchedSkills: config.watchedSkills.filter((s) => s.skillId !== skillId),
  };
  saveConfig(updated, configDir);
  return updated;
}

/** `rng` is injectable so tests get a deterministic pick instead of a real random one. */
export function pickRandomWatchedSkill(config: LocalConfig, rng: () => number = Math.random): WatchedSkill | null {
  if (config.watchedSkills.length === 0) return null;
  const index = Math.min(config.watchedSkills.length - 1, Math.floor(rng() * config.watchedSkills.length));
  return config.watchedSkills[index] ?? null;
}
