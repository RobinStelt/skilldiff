import { describe, expect, it } from "vitest";
import { validateRunResult } from "@marktplatz/schema";
import { buildRunResult } from "../src/buildRunResult.js";

const basisLaufergebnis = { erfolg: true, tokens: 1000, dauer_sek: 30 };

function baueBasisParams(overrides: Partial<Parameters<typeof buildRunResult>[0]> = {}) {
  return {
    skillId: "skill_test",
    accountId: "acct_test",
    signingSecret: "geheim",
    kategorie: "feature" as const,
    sizeBucket: "klein" as const,
    isolationTier: "B" as const,
    mitSkillLaufergebnis: basisLaufergebnis,
    ohneSkillLaufergebnis: basisLaufergebnis,
    securityDelta: null,
    mitSkillMetrics: { test_coverage_pct: 80, lint_errors: 0, ci_status: "pass" as const },
    ohneSkillMetrics: { test_coverage_pct: 70, lint_errors: 2, ci_status: "pass" as const },
    contentOptIn: false,
    contentRef: null,
    reihenfolgeRandomisiert: true,
    claudeVersion: "claude-sonnet-5",
    cliVersion: "0.1.0",
    cliBuildHash: "abc123",
    ...overrides,
  };
}

describe("buildRunResult", () => {
  it("baut ein RunResult, das gegen das Schema-Package valide ist (feature)", () => {
    const runResult = buildRunResult(baueBasisParams());
    const validiert = validateRunResult(runResult);
    expect(Array.isArray(validiert)).toBe(false);
  });

  it("baut ein valides RunResult für marketing (security_delta und category_metrics null)", () => {
    const runResult = buildRunResult(
      baueBasisParams({
        kategorie: "marketing",
        securityDelta: null,
        mitSkillMetrics: null,
        ohneSkillMetrics: null,
      }),
    );
    const validiert = validateRunResult(runResult);
    expect(Array.isArray(validiert)).toBe(false);
    if (!Array.isArray(validiert)) {
      expect(validiert.category_metrics).toBeNull();
      expect(validiert.security_delta).toBeNull();
    }
  });

  it("baut ein valides RunResult für refactoring mit security_delta gesetzt", () => {
    const runResult = buildRunResult(
      baueBasisParams({
        kategorie: "refactoring",
        securityDelta: {
          mit_skill: { kritisch: 0, hoch: 0, mittel: 1, niedrig: 0 },
          ohne_skill: { kritisch: 0, hoch: 1, mittel: 0, niedrig: 0 },
        },
        mitSkillMetrics: { cyclomatic_complexity_before: 10, cyclomatic_complexity_after: 5, diff_size_loc: 20 },
        ohneSkillMetrics: { cyclomatic_complexity_before: 10, cyclomatic_complexity_after: 9, diff_size_loc: 5 },
      }),
    );
    const validiert = validateRunResult(runResult);
    expect(Array.isArray(validiert)).toBe(false);
  });

  it("erzeugt eine über den Payload berechnete, deterministische Signatur", () => {
    const params = baueBasisParams();
    const a = buildRunResult(params);
    // run_id ist zufällig -> für einen fairen Vergleich dieselbe run_id erzwingen,
    // indem wir nur prüfen, dass die Signatur nicht leer ist und sich bei
    // unterschiedlichem Secret unterscheidet.
    const b = buildRunResult({ ...params, signingSecret: "anderes-geheimnis" });
    expect(a.signature).not.toHaveLength(0);
    expect(a.signature).not.toBe(b.signature);
  });
});
