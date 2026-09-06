import { createHmac } from "node:crypto";
import { canonicalJson } from "@marktplatz/schema";

/**
 * Local signature over the full payload (excluding the `signature` field
 * itself) — prevents tampering with the transmitted data between CLI and
 * backend, NOT manipulation at the source itself (plan section 4, field
 * comment). `signingSecret` never leaves this machine.
 *
 * Uses the shared `canonicalJson` from @marktplatz/schema (not a local
 * `JSON.stringify(payload, Object.keys(payload).sort())`, which used to
 * live here) — that approach only sorted/included top-level keys and
 * silently dropped every nested object's content. See
 * schema/src/canonicalJson.ts for the full story.
 */
export function sign(payloadWithoutSignature: Record<string, unknown>, signingSecret: string): string {
  return createHmac("sha256", signingSecret).update(canonicalJson(payloadWithoutSignature)).digest("hex");
}
