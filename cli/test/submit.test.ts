import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sendeRunResult } from "../src/upload/submit.js";
import { buildRunResult } from "../src/buildRunResult.js";

const validesRunResult = buildRunResult({
  skillId: "skill_test",
  accountId: "acct_test",
  signingSecret: "geheim",
  kategorie: "sonstige",
  sizeBucket: "klein",
  isolationTier: "C",
  mitSkillLaufergebnis: { erfolg: null, tokens: 100, dauer_sek: 5 },
  ohneSkillLaufergebnis: { erfolg: null, tokens: 120, dauer_sek: 6 },
  securityDelta: null,
  mitSkillMetrics: null,
  ohneSkillMetrics: null,
  contentOptIn: false,
  contentRef: null,
  reihenfolgeRandomisiert: true,
  claudeVersion: "claude-sonnet-5",
  cliVersion: "0.1.0",
  cliBuildHash: "abc123",
});

describe("sendeRunResult", () => {
  let mockDir: string;

  afterEach(() => {
    if (mockDir) rmSync(mockDir, { recursive: true, force: true });
  });

  it("schreibt im Mock-Modus (kein endpointUrl) eine validierte Datei", async () => {
    mockDir = mkdtempSync(join(tmpdir(), "skill-ab-mock-"));
    const ergebnis = await sendeRunResult(validesRunResult, { mockVerzeichnis: mockDir });
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) {
      expect(ergebnis.modus).toBe("mock");
      expect(existsSync(ergebnis.ziel)).toBe(true);
      const gespeichert = JSON.parse(readFileSync(ergebnis.ziel, "utf-8"));
      expect(gespeichert.run_id).toBe(validesRunResult.run_id);
    }
  });

  it("lehnt ungültige Payloads ab, BEVOR irgendetwas geschrieben/gesendet wird", async () => {
    mockDir = mkdtempSync(join(tmpdir(), "skill-ab-mock-"));
    const ungueltig = { ...validesRunResult, isolation_tier: "Z" };
    const ergebnis = await sendeRunResult(ungueltig, { mockVerzeichnis: mockDir });
    expect(ergebnis.ok).toBe(false);
    expect(readdirSync(mockDir)).toHaveLength(0);
  });
});
