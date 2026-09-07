import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalJson, type RunResult } from "@skilldiff/schema";

export function computeHmac(canonicalPayload: string, signingSecret: string): string {
  return createHmac("sha256", signingSecret).update(canonicalPayload).digest("hex");
}

/**
 * Constant-time comparison — avoids leaking secret material via timing.
 * Uses the shared `canonicalJson` from @skilldiff/schema, the same
 * function `cli/src/upload/signature.ts` signs with — previously this
 * file reproduced the CLI's canonicalization locally, including a real
 * bug where nested fields (`with_skill`, `category_metrics`,
 * `security_delta`) weren't actually covered by the signature at all. See
 * schema/src/canonicalJson.ts for the full story; that bug is fixed now.
 */
export function verifySignature(runResult: RunResult, signingSecret: string): boolean {
  const { signature, ...withoutSignature } = runResult;
  const expected = computeHmac(canonicalJson(withoutSignature), signingSecret);

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
