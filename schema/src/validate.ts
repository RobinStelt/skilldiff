import type { z } from "zod";
import { runResultSchema } from "./schema.js";
import type { RunResult } from "./types.js";

export interface ValidationError {
  /** Field path within the RunResult object, e.g. "category_metrics.with_skill.lint_errors". */
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
 * Validates unknown input data against the `RunResult` schema.
 *
 * In particular, checks (Phase 1 acceptance criteria):
 * - `security_delta` is `null` when `category` is not one of the
 *   code-adjacent categories (debugging, feature, refactoring) — for
 *   marketing/docs/other, a set value is a validation error.
 * - `content_ref` is only set when `content_opt_in === true`.
 * - `isolation_tier` is one of "A"/"B"/"C", no other value.
 *
 * @returns the validated, typed `RunResult` on success, otherwise a list
 *   of all validation errors found (not just the first).
 */
export function validateRunResult(data: unknown): RunResult | ValidationError[] {
  const result = runResultSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return toValidationErrors(result.error);
}

/** Type-guard variant for call sites that don't need an errors array. */
export function isRunResult(data: unknown): data is RunResult {
  return runResultSchema.safeParse(data).success;
}
