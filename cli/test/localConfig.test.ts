import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadOrCreateConfig, isFirstRun, markConsentSeen } from "../src/config/localConfig.js";

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
});
