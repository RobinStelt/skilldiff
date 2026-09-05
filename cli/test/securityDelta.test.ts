import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { determineSecurityDelta, isScanRelevant } from "../src/security/delta.js";
import { addSeverityCounts, emptySeverityCounts } from "../src/security/severityCounts.js";

describe("isScanRelevant", () => {
  it("is relevant only for code-adjacent categories", () => {
    expect(isScanRelevant("debugging")).toBe(true);
    expect(isScanRelevant("feature")).toBe(true);
    expect(isScanRelevant("refactoring")).toBe(true);
    expect(isScanRelevant("docs")).toBe(false);
    expect(isScanRelevant("marketing")).toBe(false);
    expect(isScanRelevant("other")).toBe(false);
  });
});

describe("addSeverityCounts", () => {
  it("sums severity levels correctly", () => {
    const a = { critical: 1, high: 2, medium: 3, low: 4 };
    const b = { critical: 5, high: 0, medium: 1, low: 0 };
    expect(addSeverityCounts(a, b)).toEqual({ critical: 6, high: 2, medium: 4, low: 4 });
  });

  it("emptySeverityCounts is the neutral element", () => {
    const a = { critical: 1, high: 2, medium: 3, low: 4 };
    expect(addSeverityCounts(a, emptySeverityCounts())).toEqual(a);
  });
});

describe("determineSecurityDelta", () => {
  let withDir: string;
  let withoutDir: string;

  afterEach(() => {
    rmSync(withDir, { recursive: true, force: true });
    rmSync(withoutDir, { recursive: true, force: true });
  });

  it("returns null for non-code-adjacent categories (no scan is run)", async () => {
    withDir = mkdtempSync(join(tmpdir(), "skill-ab-sec-with-"));
    withoutDir = mkdtempSync(join(tmpdir(), "skill-ab-sec-without-"));
    const delta = await determineSecurityDelta({ category: "marketing", withSkillDir: withDir, withoutSkillDir: withoutDir });
    expect(delta).toBeNull();
  });

  it("returns an object structure (never null) for code-adjacent categories, even without any scanners installed", async () => {
    withDir = mkdtempSync(join(tmpdir(), "skill-ab-sec-with-"));
    withoutDir = mkdtempSync(join(tmpdir(), "skill-ab-sec-without-"));
    writeFileSync(join(withDir, "index.ts"), "export const x = 1;");
    writeFileSync(join(withoutDir, "index.ts"), "export const x = 1;");
    const delta = await determineSecurityDelta({ category: "feature", withSkillDir: withDir, withoutSkillDir: withoutDir });
    expect(delta).not.toBeNull();
    expect(delta?.with_skill).toHaveProperty("critical");
    expect(delta?.without_skill).toHaveProperty("low");
  });
});
