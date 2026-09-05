import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { determineSizeBucket } from "../src/category/sizeBucket.js";

describe("determineSizeBucket", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("classifies a few files as small", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-size-"));
    writeFileSync(join(dir, "a.ts"), "");
    writeFileSync(join(dir, "b.ts"), "");
    expect(determineSizeBucket(dir)).toBe("small");
  });

  it("classifies many files as large", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-size-"));
    for (let i = 0; i < 200; i++) {
      writeFileSync(join(dir, `file-${i}.ts`), "");
    }
    expect(determineSizeBucket(dir)).toBe("large");
  });

  it("ignores node_modules when counting", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-size-"));
    mkdirSync(join(dir, "node_modules", "something"), { recursive: true });
    for (let i = 0; i < 500; i++) {
      writeFileSync(join(dir, "node_modules", "something", `f${i}.js`), "");
    }
    writeFileSync(join(dir, "index.ts"), "");
    expect(determineSizeBucket(dir)).toBe("small");
  });
});
