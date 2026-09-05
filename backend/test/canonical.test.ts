import { describe, expect, it } from "vitest";
import { computeHmac, canonicalizeLikeCli, verifySignature } from "../src/canonical.js";
import { buildSignedRunResult } from "./helpers/fixtures.js";

describe("canonical / signature verification", () => {
  it("accepts a signature produced the same way the CLI produces it", () => {
    const secret = "s3cret";
    const runResult = buildSignedRunResult(secret);
    expect(verifySignature(runResult, secret)).toBe(true);
  });

  it("rejects a run result whose signature no longer matches its (tampered) content", () => {
    // Acceptance criterion: "manipuliertes RunResult mit unveränderter, aber
    // jetzt ungültiger Signatur". We tamper with a *top-level* field
    // (tokens live inside with_skill, which the current CLI signature
    // doesn't actually cover — see the doc comment in src/canonical.ts —
    // so we tamper with cli_version instead to prove the check fires on
    // the part of the payload that IS covered).
    const secret = "s3cret";
    const runResult = buildSignedRunResult(secret);
    const tampered = { ...runResult, cli_version: "9.9.9-tampered" };
    expect(verifySignature(tampered, secret)).toBe(false);
  });

  it("rejects when verified against the wrong account secret", () => {
    const runResult = buildSignedRunResult("correct-secret");
    expect(verifySignature(runResult, "wrong-secret")).toBe(false);
  });

  it("documents the known nested-field gap in the current CLI canonicalization", () => {
    // This is the bug flagged to the user: JSON.stringify's array replacer
    // filters nested keys by the same flat name list, so nested objects
    // serialize as `{}`. Captured here as a regression trip-wire — if the
    // CLI's canonicalization is ever fixed to be a real deep-canonical
    // form, this test (and canonicalizeLikeCli's doc comment) must be
    // updated together.
    const canonical = canonicalizeLikeCli({ a: 1, with_skill: { tokens: 999 } });
    expect(canonical).toBe('{"a":1,"with_skill":{}}');
  });

  it("computeHmac is deterministic for the same input", () => {
    const a = computeHmac('{"a":1}', "secret");
    const b = computeHmac('{"a":1}', "secret");
    expect(a).toBe(b);
  });
});
