import { describe, expect, it } from "vitest";
import { computeHmac, verifySignature } from "../src/canonical.js";
import { buildSignedRunResult } from "./helpers/fixtures.js";

describe("canonical / signature verification", () => {
  it("accepts a signature produced the same way the CLI produces it", () => {
    const secret = "s3cret";
    const runResult = buildSignedRunResult(secret);
    expect(verifySignature(runResult, secret)).toBe(true);
  });

  it("rejects a run result with a tampered top-level field (acceptance criterion)", () => {
    const secret = "s3cret";
    const runResult = buildSignedRunResult(secret);
    const tampered = { ...runResult, cli_version: "9.9.9-tampered" };
    expect(verifySignature(tampered, secret)).toBe(false);
  });

  it("rejects a run result with a tampered NESTED field — the bug this canonicalization fixes", () => {
    // Previously, tampering with a nested field (with_skill/without_skill/
    // category_metrics/security_delta) went undetected: the old
    // canonicalization serialized every nested object as `{}`, so its
    // content was never actually part of what got signed. Verifies that
    // gap is closed.
    const secret = "s3cret";
    const runResult = buildSignedRunResult(secret);
    const tampered = { ...runResult, with_skill: { ...runResult.with_skill, tokens: 999999 } };
    expect(verifySignature(tampered, secret)).toBe(false);
  });

  it("rejects when verified against the wrong account secret", () => {
    const runResult = buildSignedRunResult("correct-secret");
    expect(verifySignature(runResult, "wrong-secret")).toBe(false);
  });

  it("computeHmac is deterministic for the same input", () => {
    const a = computeHmac('{"a":1}', "secret");
    const b = computeHmac('{"a":1}', "secret");
    expect(a).toBe(b);
  });
});
