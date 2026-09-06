import { canonicalJson, type RunResult } from "@marktplatz/schema";
import { computeHmac } from "../../src/canonical.js";

/** Mirrors schema/fixtures/valid/feature.json — kept in sync manually since backend can't import fixtures from another package. */
export function buildUnsignedRunResult(overrides: Partial<RunResult> = {}): Omit<RunResult, "signature"> {
  const base = {
    skill_id: "skill_api_scaffolder",
    account_id: "acct_5b7d21",
    category: "feature" as const,
    size_bucket: "large" as const,
    isolation_tier: "B" as const,
    with_skill: { success: true, tokens: 41230, duration_sec: 512 },
    without_skill: { success: true, tokens: 53880, duration_sec: 690 },
    security_delta: null,
    category_metrics: {
      with_skill: { test_coverage_pct: 92.0, lint_errors: 1, ci_status: "pass" as const },
      without_skill: { test_coverage_pct: 88.4, lint_errors: 2, ci_status: "pass" as const },
    },
    content_opt_in: true,
    content_ref: "content_ref_00042",
    run_id: "run_0002",
    order_randomized: false,
    timestamp: "2026-08-30T10:05:33Z",
    claude_version: "claude-sonnet-5",
    cli_version: "0.1.0",
    cli_build_hash: "b1f3c9d",
  };
  return { ...base, ...overrides } as Omit<RunResult, "signature">;
}

/** Builds a RunResult signed exactly the way the current CLI signs (src/canonical.ts). */
export function buildSignedRunResult(secret: string, overrides: Partial<RunResult> = {}): RunResult {
  const withoutSignature = buildUnsignedRunResult(overrides);
  const signature = computeHmac(canonicalJson(withoutSignature), secret);
  return { ...withoutSignature, signature } as RunResult;
}
