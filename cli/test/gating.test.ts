import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectLinkCapability } from "../src/isolation/linkCapability.js";
import { applyTierBGate, assertSkillSourceOutsideWorkDir, createIsolatedHome } from "../src/isolation/gating.js";

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

describe("createIsolatedHome", () => {
  let realHomeDir: string;

  afterEach(() => {
    rmSync(realHomeDir, { recursive: true, force: true });
  });

  it("copies .claude/.credentials.json from the real home so subscription login still works", () => {
    realHomeDir = mkdtempSync(join(tmpdir(), "skill-ab-real-home-"));
    mkdirSync(join(realHomeDir, ".claude"), { recursive: true });
    writeFileSync(join(realHomeDir, ".claude", ".credentials.json"), '{"token":"fake-oauth-token"}');
    // A file that must NOT leak into the isolated home — only the
    // credentials file is copied, nothing else (isolation guarantee).
    writeFileSync(join(realHomeDir, ".claude", "settings.json"), '{"personalSkillsEnabled":true}');

    const isolatedHome = createIsolatedHome(realHomeDir);
    try {
      const copiedCredentials = join(isolatedHome.path, ".claude", ".credentials.json");
      expect(existsSync(copiedCredentials)).toBe(true);
      expect(readFileSync(copiedCredentials, "utf-8")).toContain("fake-oauth-token");
      expect(existsSync(join(isolatedHome.path, ".claude", "settings.json"))).toBe(false);
    } finally {
      isolatedHome.cleanup();
    }
  });

  it("is a silent no-op when the real home has no credentials file (e.g. API-key auth)", () => {
    realHomeDir = mkdtempSync(join(tmpdir(), "skill-ab-real-home-"));

    const isolatedHome = createIsolatedHome(realHomeDir);
    try {
      expect(existsSync(join(isolatedHome.path, ".claude"))).toBe(false);
    } finally {
      isolatedHome.cleanup();
    }
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
