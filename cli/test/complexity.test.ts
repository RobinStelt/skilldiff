import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { estimateCyclomaticComplexity, computeDiffSize } from "../src/metrics/complexity.js";

describe("estimateCyclomaticComplexity", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("returns 0 without any code files", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-complexity-"));
    expect(estimateCyclomaticComplexity(dir)).toBe(0);
  });

  it("counts branching higher than straight-line code", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-complexity-"));
    writeFileSync(join(dir, "simple.ts"), "export function f() { return 1; }");
    const simple = estimateCyclomaticComplexity(dir);

    writeFileSync(
      join(dir, "branchy.ts"),
      "export function g(x: number) { if (x > 0) { for (let i=0;i<x;i++) { if (i % 2 === 0) { } } } else if (x < 0) {} return x; }",
    );
    const withBranches = estimateCyclomaticComplexity(dir);

    expect(withBranches).toBeGreaterThan(simple);
  });
});

describe("computeDiffSize", () => {
  it("returns 0 for identical directories", async () => {
    const a = mkdtempSync(join(tmpdir(), "skill-ab-diff-a-"));
    const b = mkdtempSync(join(tmpdir(), "skill-ab-diff-b-"));
    writeFileSync(join(a, "file.txt"), "same content\n");
    writeFileSync(join(b, "file.txt"), "same content\n");
    try {
      expect(await computeDiffSize(a, b)).toBe(0);
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(b, { recursive: true, force: true });
    }
  });

  it("counts changed lines between different directories", async () => {
    const a = mkdtempSync(join(tmpdir(), "skill-ab-diff-a-"));
    const b = mkdtempSync(join(tmpdir(), "skill-ab-diff-b-"));
    writeFileSync(join(a, "file.txt"), "line1\nline2\n");
    writeFileSync(join(b, "file.txt"), "line1\nline2\nline3\n");
    try {
      expect(await computeDiffSize(a, b)).toBeGreaterThan(0);
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(b, { recursive: true, force: true });
    }
  });
});
