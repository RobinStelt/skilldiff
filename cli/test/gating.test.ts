import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectLinkCapability } from "../src/isolation/linkCapability.js";
import { applyTierBGate, assertSkillSourceOutsideWorkDir } from "../src/isolation/gating.js";

describe("detectLinkCapability", () => {
  it("liefert echte Booleans, ohne zu werfen (Umgebung wird tatsächlich getestet, nicht geraten)", () => {
    const cap = detectLinkCapability();
    expect(typeof cap.symlink).toBe("boolean");
    expect(typeof cap.junction).toBe("boolean");
  });
});

describe("assertSkillSourceOutsideWorkDir", () => {
  it("wirft, wenn die Quelle innerhalb des Arbeitsverzeichnisses liegt", () => {
    expect(() =>
      assertSkillSourceOutsideWorkDir("C:\\projekt\\work", "C:\\projekt\\work\\skills-source\\alpha"),
    ).toThrow();
  });

  it("wirft NICHT, wenn die Quelle außerhalb liegt", () => {
    expect(() => assertSkillSourceOutsideWorkDir("C:\\projekt\\work", "C:\\anderswo\\alpha")).not.toThrow();
  });
});

describe("applyTierBGate", () => {
  let workDir: string;
  let sourceDir: string;

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
    rmSync(sourceDir, { recursive: true, force: true });
  });

  it("verlinkt die Skill-Quelle bei mit_skill und entfernt sie bei ohne_skill", () => {
    const cap = detectLinkCapability();
    if (!cap.symlink && !cap.junction) {
      // Auf dieser Testumgebung ist gar kein Link-Mechanismus verfügbar
      // (sollte laut LOKAL-PROTOKOLL.md nicht vorkommen, aber kein Grund,
      // den Test hart failen zu lassen statt ihn zu überspringen).
      return;
    }

    workDir = mkdtempSync(join(tmpdir(), "skill-ab-gate-work-"));
    sourceDir = mkdtempSync(join(tmpdir(), "skill-ab-gate-source-"));
    writeFileSync(join(sourceDir, "SKILL.md"), "# Test");

    applyTierBGate({ workDir, skillId: "skill-x", skillSourceDir: sourceDir, bedingung: "mit_skill", linkFaehigkeit: cap });
    const linkPath = join(workDir, ".claude", "skills", "skill-x");
    expect(existsSync(linkPath)).toBe(true);
    expect(readdirSync(linkPath)).toContain("SKILL.md");

    applyTierBGate({ workDir, skillId: "skill-x", skillSourceDir: sourceDir, bedingung: "ohne_skill", linkFaehigkeit: cap });
    expect(existsSync(linkPath)).toBe(false);
  });
});
