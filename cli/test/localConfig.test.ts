import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ladeOderErzeugeConfig, istErsterLauf, markiereConsentGesehen } from "../src/config/localConfig.js";

describe("localConfig", () => {
  let configDir: string;

  afterEach(() => {
    if (configDir) rmSync(configDir, { recursive: true, force: true });
  });

  it("erzeugt beim ersten Aufruf eine neue Config mit consentGesehenAm=null", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    const config = ladeOderErzeugeConfig(configDir);
    expect(istErsterLauf(config)).toBe(true);
    expect(config.accountId).toBeTruthy();
    expect(config.standardConsentErteilt).toBe(false);
  });

  it("lädt eine bereits gespeicherte Config unverändert erneut (stabile accountId)", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    const erste = ladeOderErzeugeConfig(configDir);
    const zweite = ladeOderErzeugeConfig(configDir);
    expect(zweite.accountId).toBe(erste.accountId);
  });

  it("persistiert die Consent-Entscheidung, sodass istErsterLauf danach false ist", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    let config = ladeOderErzeugeConfig(configDir);
    config = markiereConsentGesehen(config, { standardConsentErteilt: true, contentOptIn: false }, configDir);
    expect(istErsterLauf(config)).toBe(false);

    const neuGeladen = ladeOderErzeugeConfig(configDir);
    expect(istErsterLauf(neuGeladen)).toBe(false);
    expect(neuGeladen.standardConsentErteilt).toBe(true);
  });
});
