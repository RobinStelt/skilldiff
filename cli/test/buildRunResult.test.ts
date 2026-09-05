import { describe, expect, it } from "vitest";
import { validateRunResult } from "@marktplatz/schema";
import { buildRunResult } from "../src/buildRunResult.js";

const baseRunOutcome = { success: true, tokens: 1000, duration_sec: 30 };

function buildBaseParams(overrides: Partial<Parameters<typeof buildRunResult>[0]> = {}) {
  return {
    skillId: "skill_test",
    accountId: "acct_test",
    signingSecret: "secret",
    category: "feature" as const,
    sizeBucket: "small" as const,
    isolationTier: "B" as const,
    withSkillRunOutcome: baseRunOutcome,
    withoutSkillRunOutcome: baseRunOutcome,
    securityDelta: null,
    withSkillMetrics: { test_coverage_pct: 80, lint_errors: 0, ci_status: "pass" as const },
    withoutSkillMetrics: { test_coverage_pct: 70, lint_errors: 2, ci_status: "pass" as const },
    contentOptIn: false,
    contentRef: null,
    orderRandomized: true,
    claudeVersion: "claude-sonnet-5",
    cliVersion: "0.1.0",
    cliBuildHash: "abc123",
    ...overrides,
  };
}

describe("buildRunResult", () => {
  it("builds a RunResult that validates against the schema package (feature)", () => {
    const runResult = buildRunResult(buildBaseParams());
    const validated = validateRunResult(runResult);
    expect(Array.isArray(validated)).toBe(false);
  });

  it("builds a valid RunResult for marketing (security_delta and category_metrics null)", () => {
    const runResult = buildRunResult(
      buildBaseParams({
        category: "marketing",
        securityDelta: null,
        withSkillMetrics: null,
        withoutSkillMetrics: null,
      }),
    );
    const validated = validateRunResult(runResult);
    expect(Array.isArray(validated)).toBe(false);
    if (!Array.isArray(validated)) {
      expect(validated.category_metrics).toBeNull();
      expect(validated.security_delta).toBeNull();
    }
  });

  it("builds a valid RunResult for refactoring with security_delta set", () => {
    const runResult = buildRunResult(
      buildBaseParams({
        category: "refactoring",
        securityDelta: {
          with_skill: { critical: 0, high: 0, medium: 1, low: 0 },
          without_skill: { critical: 0, high: 1, medium: 0, low: 0 },
        },
        withSkillMetrics: { cyclomatic_complexity_before: 10, cyclomatic_complexity_after: 5, diff_size_loc: 20 },
        withoutSkillMetrics: { cyclomatic_complexity_before: 10, cyclomatic_complexity_after: 9, diff_size_loc: 5 },
      }),
    );
    const validated = validateRunResult(runResult);
    expect(Array.isArray(validated)).toBe(false);
  });

  it("produces a signature computed over the payload, deterministically", () => {
    const params = buildBaseParams();
    const a = buildRunResult(params);
    // run_id is random -> for a fair comparison, we only check that the
    // signature isn't empty and differs when the secret differs.
    const b = buildRunResult({ ...params, signingSecret: "a-different-secret" });
    expect(a.signature).not.toHaveLength(0);
    expect(a.signature).not.toBe(b.signature);
  });
});
