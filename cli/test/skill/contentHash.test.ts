import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashSkillSourceDir } from "../../src/skill/contentHash.js";

function makeSkillDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "skill-ab-hash-"));
  for (const [relPath, content] of Object.entries(files)) {
    const full = join(dir, relPath);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content, "utf-8");
  }
  return dir;
}

describe("hashSkillSourceDir", () => {
  it("is deterministic for the same content", () => {
    const dir = makeSkillDir({ "SKILL.md": "# hi", "lib/helper.js": "module.exports = 1;" });
    try {
      expect(hashSkillSourceDir(dir)).toBe(hashSkillSourceDir(dir));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("changes when a file's content changes", () => {
    const dirA = makeSkillDir({ "SKILL.md": "# v1" });
    const dirB = makeSkillDir({ "SKILL.md": "# v2" });
    try {
      expect(hashSkillSourceDir(dirA)).not.toBe(hashSkillSourceDir(dirB));
    } finally {
      rmSync(dirA, { recursive: true, force: true });
      rmSync(dirB, { recursive: true, force: true });
    }
  });

  it("is independent of directory-listing order", () => {
    const dirA = makeSkillDir({ "a.md": "1", "b/c.md": "2" });
    const dirB = makeSkillDir({ "b/c.md": "2", "a.md": "1" });
    try {
      expect(hashSkillSourceDir(dirA)).toBe(hashSkillSourceDir(dirB));
    } finally {
      rmSync(dirA, { recursive: true, force: true });
      rmSync(dirB, { recursive: true, force: true });
    }
  });

  it("changes when a file is added, even with the same total content", () => {
    const dirA = makeSkillDir({ "a.md": "ab" });
    const dirB = makeSkillDir({ "a.md": "a", "b.md": "b" });
    try {
      expect(hashSkillSourceDir(dirA)).not.toBe(hashSkillSourceDir(dirB));
    } finally {
      rmSync(dirA, { recursive: true, force: true });
      rmSync(dirB, { recursive: true, force: true });
    }
  });
});
