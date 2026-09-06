import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadOrCreateConfig, setConfigValue } from "../src/config/localConfig.js";

describe("setConfigValue (skill-ab config set/unset)", () => {
  let configDir: string;

  afterEach(() => {
    if (configDir) rmSync(configDir, { recursive: true, force: true });
  });

  it("persists an endpoint default across reloads", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    let config = loadOrCreateConfig(configDir);
    config = setConfigValue(config, "endpoint", "http://example.com/v1/run-results", configDir);
    expect(config.endpointUrl).toBe("http://example.com/v1/run-results");

    const reloaded = loadOrCreateConfig(configDir);
    expect(reloaded.endpointUrl).toBe("http://example.com/v1/run-results");
  });

  it("persists a claude-bin override across reloads", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    let config = loadOrCreateConfig(configDir);
    config = setConfigValue(config, "claude-bin", "C:\\claude\\claude.exe", configDir);
    expect(config.claudeBinOverride).toBe("C:\\claude\\claude.exe");

    const reloaded = loadOrCreateConfig(configDir);
    expect(reloaded.claudeBinOverride).toBe("C:\\claude\\claude.exe");
  });

  it("clears a value back to null", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    let config = loadOrCreateConfig(configDir);
    config = setConfigValue(config, "endpoint", "http://example.com", configDir);
    config = setConfigValue(config, "endpoint", null, configDir);
    expect(config.endpointUrl).toBeNull();
  });

  it("fills in endpointUrl/claudeBinOverride as null when loading a config.json written before those fields existed", () => {
    configDir = mkdtempSync(join(tmpdir(), "skill-ab-config-"));
    const config = loadOrCreateConfig(configDir); // creates a fresh one with the new fields
    // Simulate an old config.json by removing the new fields, then reload.
    const { endpointUrl: _e, claudeBinOverride: _c, ...withoutNewFields } = config;
    writeFileSync(join(configDir, "config.json"), JSON.stringify(withoutNewFields));

    const reloaded = loadOrCreateConfig(configDir);
    expect(reloaded.endpointUrl).toBeNull();
    expect(reloaded.claudeBinOverride).toBeNull();
  });
});
