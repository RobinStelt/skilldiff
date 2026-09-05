import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectCategory } from "../src/category/detectCategory.js";

describe("detectCategory", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-category-"));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("detects debugging from keywords in the task", () => {
    expect(detectCategory({ task: "Fix the bug in the login flow", workDir: dir })).toBe("debugging");
  });

  it("detects refactoring from keywords", () => {
    expect(detectCategory({ task: "Please refactor this module, it's too complex", workDir: dir })).toBe(
      "refactoring",
    );
  });

  it("detects docs from keywords", () => {
    expect(detectCategory({ task: "Rewrite the README documentation", workDir: dir })).toBe("docs");
  });

  it("detects marketing from keywords", () => {
    expect(detectCategory({ task: "Write ad copy for the landing page", workDir: dir })).toBe(
      "marketing",
    );
  });

  it("falls back to the file-type heuristic for a neutral task description (code -> feature)", () => {
    const codeDir = join(dir, "code-project");
    mkdirSync(codeDir, { recursive: true });
    writeFileSync(join(codeDir, "index.ts"), "export const x = 1;");
    expect(detectCategory({ task: "Build a new sorting function", workDir: codeDir })).toBe("feature");
  });

  it("detects other for an empty directory without clear keywords", () => {
    const emptyDir = join(dir, "empty");
    mkdirSync(emptyDir, { recursive: true });
    expect(detectCategory({ task: "Do something", workDir: emptyDir })).toBe("other");
  });
});
