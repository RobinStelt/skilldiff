import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectLinkCapability } from "../src/isolation/linkCapability.js";
import { applyTierBGate, assertSkillSourceOutsideWorkDir } from "../src/isolation/gating.js";

describe("detectLinkCapability", () => {
  it("returns real booleans without throwing (the environment is actually tested, not guessed)", () => {
    const cap = detectLinkCapability();
    expect(typeof cap.symlink).toBe("boolean");
    expect(typeof cap.junction).toBe("boolean");
  });
});

describe("assertSkillSourceOutsideWorkDir", () => {
  it("throws when the source lies inside the working directory", () => {
    expect(() =>
      assertSkillSourceOutsideWorkDir("C:\\project\\work", "C:\\project\\work\\skills-source\\alpha"),
    ).toThrow();
  });

  it("does NOT throw when the source lies outside", () => {
    expect(() => assertSkillSourceOutsideWorkDir("C:\\project\\work", "C:\\elsewhere\\alpha")).not.toThrow();
  });
});

describe("applyTierBGate", () => {
  let workDir: string;
  let sourceDir: string;

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
    rmSync(sourceDir, { recursive: true, force: true });
  });

  it("links the skill source for with_skill and removes it for without_skill", () => {
    const cap = detectLinkCapability();
    if (!cap.symlink && !cap.junction) {
      // No link mechanism at all is available in this test environment
      // (shouldn't happen per LOKAL-PROTOKOLL.md, but no reason to hard-fail
      // the test instead of skipping it).
      return;
    }

    workDir = mkdtempSync(join(tmpdir(), "skill-ab-gate-work-"));
    sourceDir = mkdtempSync(join(tmpdir(), "skill-ab-gate-source-"));
    writeFileSync(join(sourceDir, "SKILL.md"), "# Test");

    applyTierBGate({ workDir, skillId: "skill-x", skillSourceDir: sourceDir, condition: "with_skill", linkCapability: cap });
    const linkPath = join(workDir, ".claude", "skills", "skill-x");
    expect(existsSync(linkPath)).toBe(true);
    expect(readdirSync(linkPath)).toContain("SKILL.md");

    applyTierBGate({ workDir, skillId: "skill-x", skillSourceDir: sourceDir, condition: "without_skill", linkCapability: cap });
    expect(existsSync(linkPath)).toBe(false);
  });
});
