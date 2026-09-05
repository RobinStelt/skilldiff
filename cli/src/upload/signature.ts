import { createHmac } from "node:crypto";

/**
 * Local signature over the full payload (excluding the `signature` field
 * itself) — prevents tampering with the transmitted data between CLI and
 * backend, NOT manipulation at the source itself (plan section 4, field
 * comment). `signingSecret` never leaves this machine.
 */
export function sign(payloadWithoutSignature: Record<string, unknown>, signingSecret: string): string {
  const canonical = JSON.stringify(payloadWithoutSignature, Object.keys(payloadWithoutSignature).sort());
  return createHmac("sha256", signingSecret).update(canonical).digest("hex");
}
