import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ermittleSecurityDelta, istScanRelevant } from "../src/security/delta.js";
import { addiereSeverityCounts, leereSeverityCounts } from "../src/security/severityCounts.js";

describe("istScanRelevant", () => {
  it("ist nur für code-nahe Kategorien relevant", () => {
    expect(istScanRelevant("debugging")).toBe(true);
    expect(istScanRelevant("feature")).toBe(true);
    expect(istScanRelevant("refactoring")).toBe(true);
    expect(istScanRelevant("doku")).toBe(false);
    expect(istScanRelevant("marketing")).toBe(false);
    expect(istScanRelevant("sonstige")).toBe(false);
  });
});

describe("addiereSeverityCounts", () => {
  it("summiert Severity-Stufen korrekt", () => {
    const a = { kritisch: 1, hoch: 2, mittel: 3, niedrig: 4 };
    const b = { kritisch: 5, hoch: 0, mittel: 1, niedrig: 0 };
    expect(addiereSeverityCounts(a, b)).toEqual({ kritisch: 6, hoch: 2, mittel: 4, niedrig: 4 });
  });

  it("leereSeverityCounts ist neutrales Element", () => {
    const a = { kritisch: 1, hoch: 2, mittel: 3, niedrig: 4 };
    expect(addiereSeverityCounts(a, leereSeverityCounts())).toEqual(a);
  });
});

describe("ermittleSecurityDelta", () => {
  let mitDir: string;
  let ohneDir: string;

  afterEach(() => {
    rmSync(mitDir, { recursive: true, force: true });
    rmSync(ohneDir, { recursive: true, force: true });
  });

  it("liefert null für nicht code-nahe Kategorien (kein Scan wird ausgeführt)", async () => {
    mitDir = mkdtempSync(join(tmpdir(), "skill-ab-sec-mit-"));
    ohneDir = mkdtempSync(join(tmpdir(), "skill-ab-sec-ohne-"));
    const delta = await ermittleSecurityDelta({ kategorie: "marketing", mitSkillDir: mitDir, ohneSkillDir: ohneDir });
    expect(delta).toBeNull();
  });

  it("liefert eine Objektstruktur (nie null) für code-nahe Kategorien, auch ohne installierte Scanner", async () => {
    mitDir = mkdtempSync(join(tmpdir(), "skill-ab-sec-mit-"));
    ohneDir = mkdtempSync(join(tmpdir(), "skill-ab-sec-ohne-"));
    writeFileSync(join(mitDir, "index.ts"), "export const x = 1;");
    writeFileSync(join(ohneDir, "index.ts"), "export const x = 1;");
    const delta = await ermittleSecurityDelta({ kategorie: "feature", mitSkillDir: mitDir, ohneSkillDir: ohneDir });
    expect(delta).not.toBeNull();
    expect(delta?.mit_skill).toHaveProperty("kritisch");
    expect(delta?.ohne_skill).toHaveProperty("niedrig");
  });
});
