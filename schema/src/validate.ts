import type { z } from "zod";
import { runResultSchema } from "./schema.js";
import type { RunResult } from "./types.js";

export interface ValidationError {
  /** Feldpfad innerhalb des RunResult-Objekts, z.B. "category_metrics.mit_skill.lint_errors". */
  path: string;
  message: string;
}

function toValidationErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Validiert unbekannte Eingabedaten gegen das `RunResult`-Schema.
 *
 * Prüft insbesondere (Akzeptanzkriterien Phase 1):
 * - `security_delta` ist `null`, wenn `category` nicht in einer code-nahen
 *   Kategorie liegt (debugging, feature, refactoring) — für marketing/doku/
 *   sonstige ist ein gesetzter Wert ein Validierungsfehler.
 * - `content_ref` ist nur gesetzt, wenn `content_opt_in === true`.
 * - `isolation_tier` ist einer von "A"/"B"/"C", kein anderer Wert.
 *
 * @returns das validierte, typisierte `RunResult` bei Erfolg, sonst eine
 *   Liste aller gefundenen Validierungsfehler (nicht nur des ersten).
 */
export function validateRunResult(data: unknown): RunResult | ValidationError[] {
  const result = runResultSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return toValidationErrors(result.error);
}

/** Type-Guard-Variante für Call-Sites, die kein Errors-Array brauchen. */
export function isRunResult(data: unknown): data is RunResult {
  return runResultSchema.safeParse(data).success;
}
