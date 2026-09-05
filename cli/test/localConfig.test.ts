import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadOrCreateConfig,
  isFirstRun,
  markConsentSeen,
  addWatchedSkill,
  removeWatchedSkill,
  pickRandomWatchedSkill,
} from "../src/config/localConfig.js";

describe("localConfig", () => {
  let configDir: string;

  afterEach(() => {
    if (configDir) rmSync(configDir, { recursive: true, force: true });
  });

  it("creates a new config with consentSeenAt=null on first call", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    const config = loadOrCreateConfig(configDir);
    expect(isFirstRun(config)).toBe(true);
    expect(config.accountId).toBeTruthy();
    expect(config.standardConsentGiven).toBe(false);
  });

  it("reloads an already saved config unchanged (stable accountId)", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    const first = loadOrCreateConfig(configDir);
    const second = loadOrCreateConfig(configDir);
    expect(second.accountId).toBe(first.accountId);
  });

  it("persists the consent decision, so isFirstRun is false afterward", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    let config = loadOrCreateConfig(configDir);
    config = markConsentSeen(config, { standardConsentGiven: true, contentOptIn: false }, configDir);
    expect(isFirstRun(config)).toBe(false);

    const reloaded = loadOrCreateConfig(configDir);
    expect(isFirstRun(reloaded)).toBe(false);
    expect(reloaded.standardConsentGiven).toBe(true);
  });

  it("fills in watchedSkills=[] when loading a config.json written before that field existed", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({
        accountId: "old-account",
        signingSecret: "old-secret",
        consentSeenAt: "2025-01-01T00:00:00Z",
        standardConsentGiven: true,
        contentOptIn: false,
      }),
    );
    const config = loadOrCreateConfig(configDir);
    expect(config.watchedSkills).toEqual([]);
    expect(config.accountId).toBe("old-account");
  });
});

describe("watched skills", () => {
  let configDir: string;

  afterEach(() => {
    if (configDir) rmSync(configDir, { recursive: true, force: true });
  });

  it("adds a watched skill and persists it", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    let config = loadOrCreateConfig(configDir);
    config = addWatchedSkill(config, { skillId: "ponytail", skillSourceDir: "C:\\skills\\ponytail" }, configDir);
    expect(config.watchedSkills).toEqual([{ skillId: "ponytail", skillSourceDir: "C:\\skills\\ponytail" }]);

    const reloaded = loadOrCreateConfig(configDir);
    expect(reloaded.watchedSkills).toEqual([{ skillId: "ponytail", skillSourceDir: "C:\\skills\\ponytail" }]);
  });

  it("replaces (not duplicates) an existing entry with the same skillId", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    let config = loadOrCreateConfig(configDir);
    config = addWatchedSkill(config, { skillId: "ponytail", skillSourceDir: "old/path" }, configDir);
    config = addWatchedSkill(config, { skillId: "ponytail", skillSourceDir: "new/path" }, configDir);
    expect(config.watchedSkills).toEqual([{ skillId: "ponytail", skillSourceDir: "new/path" }]);
  });

  it("removes a watched skill by id", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    let config = loadOrCreateConfig(configDir);
    config = addWatchedSkill(config, { skillId: "ponytail", skillSourceDir: "a" }, configDir);
    config = addWatchedSkill(config, { skillId: "humanizer", skillSourceDir: "b" }, configDir);
    config = removeWatchedSkill(config, "ponytail", configDir);
    expect(config.watchedSkills).toEqual([{ skillId: "humanizer", skillSourceDir: "b" }]);
  });

  it("picks null from an empty watch list", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    const config = loadOrCreateConfig(configDir);
    expect(pickRandomWatchedSkill(config)).toBeNull();
  });

  it("picks deterministically according to the injected rng, never a bundle of several", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    let config = loadOrCreateConfig(configDir);
    config = addWatchedSkill(config, { skillId: "a", skillSourceDir: "a-dir" }, configDir);
    config = addWatchedSkill(config, { skillId: "b", skillSourceDir: "b-dir" }, configDir);
    config = addWatchedSkill(config, { skillId: "c", skillSourceDir: "c-dir" }, configDir);

    expect(pickRandomWatchedSkill(config, () => 0)?.skillId).toBe("a");
    expect(pickRandomWatchedSkill(config, () => 0.999)?.skillId).toBe("c");
  });
});
