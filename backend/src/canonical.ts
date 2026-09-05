import { createHmac, timingSafeEqual } from "node:crypto";
import type { RunResult } from "@marktplatz/schema";

/**
 * Reproduces the exact canonicalization from cli/src/upload/signature.ts
 * (`signiere`) so that HMACs computed here match what the CLI actually
 * signs, byte for byte:
 *
 *   JSON.stringify(payloadOhneSignatur, Object.keys(payloadOhneSignatur).sort())
 *
 * ⚠️ KNOWN GAP, not something this backend can fix on its own: `JSON.stringify`
 * with an array replacer filters property names against that SAME array at
 * every nesting level, not just the top level. Since the array only lists
 * top-level keys, every nested object (`with_skill`, `without_skill`,
 * `category_metrics`, `security_delta`) serializes as `{}` — e.g.
 * `JSON.stringify({ a: 1, with_skill: { tokens: 5 } }, ["a", "with_skill"])`
 * yields `{"a":1,"with_skill":{}}`. In practice this means the current CLI
 * signature does NOT protect the nested measurement fields against
 * tampering in transit — only the flat/top-level fields are actually
 * covered. This needs a fix on the CLI side (ideally: a single canonical-
 * JSON helper shared via @marktplatz/schema so both sides can never drift
 * apart again) — flagged to the user, out of scope for this file, which
 * must interoperate with the CLI as it exists today.
 */
export function canonicalizeLikeCli(payloadWithoutSignature: Record<string, unknown>): string {
  return JSON.stringify(payloadWithoutSignature, Object.keys(payloadWithoutSignature).sort());
}

export function computeHmac(canonicalPayload: string, signingSecret: string): string {
  return createHmac("sha256", signingSecret).update(canonicalPayload).digest("hex");
}

/** Constant-time comparison — avoids leaking secret material via timing. */
export function verifySignature(runResult: RunResult, signingSecret: string): boolean {
  const { signature, ...withoutSignature } = runResult;
  const expected = computeHmac(canonicalizeLikeCli(withoutSignature), signingSecret);

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
