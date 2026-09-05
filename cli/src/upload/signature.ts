import { createHmac } from "node:crypto";

/**
 * Lokale Signatur über den vollständigen Payload (ohne das `signature`-Feld
 * selbst) — verhindert nachträgliche Fälschung der übertragenen Daten
 * zwischen CLI und Backend, NICHT Manipulation an der Quelle selbst (Plan
 * Abschnitt 4, Feldkommentar). `signingSecret` verlässt nie diesen Rechner.
 */
export function signiere(payloadOhneSignatur: Record<string, unknown>, signingSecret: string): string {
  const kanonisch = JSON.stringify(payloadOhneSignatur, Object.keys(payloadOhneSignatur).sort());
  return createHmac("sha256", signingSecret).update(kanonisch).digest("hex");
}
