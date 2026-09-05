import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateRunResult, type ValidationError } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "fixtures");

function loadFixtures(sub: "valid" | "invalid") {
  const dir = join(fixturesDir, sub);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ name: f, data: JSON.parse(readFileSync(join(dir, f), "utf-8")) }));
}

function isErrorList(result: unknown): result is ValidationError[] {
  return Array.isArray(result);
}

describe("validateRunResult — positive fixtures", () => {
  const fixtures = loadFixtures("valid");

  it("has at least one valid fixture per category", () => {
    const categories = ["debugging", "feature", "refactoring", "docs", "marketing", "other"];
    for (const category of categories) {
      const found = fixtures.some((f) => f.data.category === category);
      expect(found, `no valid fixture for category "${category}"`).toBe(true);
    }
  });

  for (const { name, data } of fixtures) {
    it(`accepts ${name}`, () => {
      const result = validateRunResult(data);
      if (isErrorList(result)) {
        throw new Error(
          `${name} should have been valid, errors: ${JSON.stringify(result, null, 2)}`,
        );
      }
      expect(result.category).toBe(data.category);
    });
  }
});

describe("validateRunResult — negative fixtures", () => {
  const fixtures = loadFixtures("invalid");

  it("has at least 3 negative fixtures", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(3);
  });

  for (const { name, data } of fixtures) {
    it(`rejects ${name}`, () => {
      const result = validateRunResult(data);
      expect(isErrorList(result), `${name} should have been rejected`).toBe(true);
      expect((result as ValidationError[]).length).toBeGreaterThan(0);
    });
  }
});

describe("validateRunResult — targeted rules", () => {
  it("rejects security_delta != null for category=marketing", () => {
    const invalid = {
      ...JSON.parse(
        readFileSync(join(fixturesDir, "valid", "marketing.json"), "utf-8"),
      ),
      security_delta: {
        with_skill: { critical: 0, high: 0, medium: 0, low: 0 },
        without_skill: { critical: 0, high: 0, medium: 0, low: 0 },
      },
    };
    const result = validateRunResult(invalid);
    expect(isErrorList(result)).toBe(true);
  });

  it("accepts security_delta === null for a code-adjacent category (no code artifact produced)", () => {
    const valid = {
      ...JSON.parse(readFileSync(join(fixturesDir, "valid", "feature.json"), "utf-8")),
      security_delta: null,
    };
    const result = validateRunResult(valid);
    expect(isErrorList(result)).toBe(false);
  });

  it("rejects content_ref set while content_opt_in=false", () => {
    const invalid = {
      ...JSON.parse(readFileSync(join(fixturesDir, "valid", "docs.json"), "utf-8")),
      content_opt_in: false,
      content_ref: "set_anyway",
    };
    const result = validateRunResult(invalid);
    expect(isErrorList(result)).toBe(true);
  });

  it("rejects an unknown isolation_tier", () => {
    const invalid = {
      ...JSON.parse(readFileSync(join(fixturesDir, "valid", "debugging.json"), "utf-8")),
      isolation_tier: "Z",
    };
    const result = validateRunResult(invalid);
    expect(isErrorList(result)).toBe(true);
  });
});
