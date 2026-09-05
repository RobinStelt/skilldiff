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

describe("validateRunResult — positive Fixtures", () => {
  const fixtures = loadFixtures("valid");

  it("findet mindestens einen validen Fixture pro Kategorie", () => {
    const kategorien = ["debugging", "feature", "refactoring", "doku", "marketing", "sonstige"];
    for (const kategorie of kategorien) {
      const passend = fixtures.some((f) => f.data.category === kategorie);
      expect(passend, `kein valider Fixture für Kategorie "${kategorie}"`).toBe(true);
    }
  });

  for (const { name, data } of fixtures) {
    it(`akzeptiert ${name}`, () => {
      const result = validateRunResult(data);
      if (isErrorList(result)) {
        throw new Error(
          `${name} hätte gültig sein sollen, Fehler: ${JSON.stringify(result, null, 2)}`,
        );
      }
      expect(result.category).toBe(data.category);
    });
  }
});

describe("validateRunResult — negative Fixtures", () => {
  const fixtures = loadFixtures("invalid");

  it("hat mindestens 3 negative Fixtures", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(3);
  });

  for (const { name, data } of fixtures) {
    it(`lehnt ${name} ab`, () => {
      const result = validateRunResult(data);
      expect(isErrorList(result), `${name} hätte abgelehnt werden sollen`).toBe(true);
      expect((result as ValidationError[]).length).toBeGreaterThan(0);
    });
  }
});

describe("validateRunResult — gezielte Regeln", () => {
  it("lehnt security_delta != null bei category=marketing ab", () => {
    const invalid = {
      ...JSON.parse(
        readFileSync(join(fixturesDir, "valid", "marketing.json"), "utf-8"),
      ),
      security_delta: {
        mit_skill: { kritisch: 0, hoch: 0, mittel: 0, niedrig: 0 },
        ohne_skill: { kritisch: 0, hoch: 0, mittel: 0, niedrig: 0 },
      },
    };
    const result = validateRunResult(invalid);
    expect(isErrorList(result)).toBe(true);
  });

  it("akzeptiert security_delta === null bei code-naher Kategorie (kein Code-Artefakt entstanden)", () => {
    const valid = {
      ...JSON.parse(readFileSync(join(fixturesDir, "valid", "feature.json"), "utf-8")),
      security_delta: null,
    };
    const result = validateRunResult(valid);
    expect(isErrorList(result)).toBe(false);
  });

  it("lehnt content_ref gesetzt bei content_opt_in=false ab", () => {
    const invalid = {
      ...JSON.parse(readFileSync(join(fixturesDir, "valid", "doku.json"), "utf-8")),
      content_opt_in: false,
      content_ref: "trotzdem_gesetzt",
    };
    const result = validateRunResult(invalid);
    expect(isErrorList(result)).toBe(true);
  });

  it("lehnt unbekannten isolation_tier ab", () => {
    const invalid = {
      ...JSON.parse(readFileSync(join(fixturesDir, "valid", "debugging.json"), "utf-8")),
      isolation_tier: "Z",
    };
    const result = validateRunResult(invalid);
    expect(isErrorList(result)).toBe(true);
  });
});
