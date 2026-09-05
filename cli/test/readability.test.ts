import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeReadabilityScore } from "../src/metrics/readability.js";

describe("computeReadabilityScore", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("returns 0 without any docs files", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-readability-"));
    expect(computeReadabilityScore(dir)).toBe(0);
  });

  it("scores short, simple sentences higher than long, convoluted ones", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-readability-"));
    writeFileSync(
      join(dir, "simple.md"),
      "The dog ran. The cat slept. It was nice.",
    );
    const simpleScore = computeReadabilityScore(dir);

    rmSync(dir, { recursive: true, force: true });
    dir = mkdtempSync(join(tmpdir(), "skill-ab-readability-"));
    writeFileSync(
      join(dir, "complex.md"),
      "Although the implementation of the configuration management system had originally been conceived as an interim solution, the resulting architectural decision, which established numerous interdependencies between the individual modules, ultimately proved fundamentally problematic for long-term maintainability.",
    );
    const complexScore = computeReadabilityScore(dir);

    expect(simpleScore).toBeGreaterThan(complexScore);
  });
});
