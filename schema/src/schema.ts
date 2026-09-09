import { executionSchema } from "./execution.js";
import { z } from "zod";

/**
 * Single source of truth for the data schema from section 4 of the project
 * plan (`skill-ab-marktplatz-plan.md`). TypeScript types are derived via
 * `z.infer<>` (see `types.ts`), and the JSON schema for backend runtime
 * validation is exported via `zod-to-json-schema` (see
 * `scripts/export-json-schema.ts`).
 *
 * No `RegressionCheck` type — a regression re-check is deliberately not
 * part of this project (plan, sections 4 & 8).
 */

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

export const categorySchema = z.enum([
  "debugging",
  "feature",
  "docs",
  "refactoring",
  "marketing",
  "other",
]);

/** Categories that produce a code artifact and are allowed to have a non-null `security_delta`. */
export const codeAdjacentCategories = ["debugging", "feature", "refactoring"] as const;

export const sizeBucketSchema = z.enum(["small", "medium", "large"]);

export const isolationTierSchema = z.enum(["A", "B", "C"]);

/** ISO-8601 timestamp, e.g. "2026-09-05T12:34:56Z". */
export const iso8601Schema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "timestamp must be a valid ISO8601 timestamp",
  });

const nonNegativeInt = z.number().int().nonnegative();

export const runOutcomeSchema = z.object({
  success: z.boolean().nullable(),
  tokens: nonNegativeInt,
  duration_sec: nonNegativeInt,
});

export const severityCountsSchema = z.object({
  critical: nonNegativeInt,
  high: nonNegativeInt,
  medium: nonNegativeInt,
  low: nonNegativeInt,
});

export const securityDeltaSchema = z
  .object({
    with_skill: severityCountsSchema,
    without_skill: severityCountsSchema,
  })
  .nullable();

// ---------------------------------------------------------------------------
// category_metrics — discriminated union by `category` (plan, section 4, table)
// ---------------------------------------------------------------------------

const ciStatusSchema = z.enum(["pass", "fail", "n/a"]);

/** debugging & feature share the same extra metrics. */
const debuggingFeatureMetricsSchema = z.object({
  test_coverage_pct: z.number().min(0).max(100),
  lint_errors: nonNegativeInt,
  ci_status: ciStatusSchema,
});

const refactoringMetricsSchema = z.object({
  cyclomatic_complexity_before: z.number().nonnegative(),
  cyclomatic_complexity_after: z.number().nonnegative(),
  diff_size_loc: nonNegativeInt,
});

const docsMetricsSchema = z.object({
  readability_score: z.number(),
});

function pairSchema<T extends z.ZodTypeAny>(metricSchema: T) {
  return z.object({
    with_skill: metricSchema,
    without_skill: metricSchema,
  });
}

export const categoryMetricsDebuggingSchema = pairSchema(debuggingFeatureMetricsSchema);
export const categoryMetricsRefactoringSchema = pairSchema(refactoringMetricsSchema);
export const categoryMetricsDocsSchema = pairSchema(docsMetricsSchema);

// ---------------------------------------------------------------------------
// Fields shared by every RunResult variant (everything except category & category_metrics)
// ---------------------------------------------------------------------------

const sharedFields = {
  skill_id: z.string().min(1),
  /**
   * sha256 (hex) over the skill source directory's file paths + contents at
   * run time (cli/src/skill/contentHash.ts) — a self-maintaining stand-in
   * for a version number, since skill authors can't be relied on to bump
   * one. Without this, two measurements under the same `skill_id` are
   * silently assumed to be the same skill even after its content changed,
   * which would quietly corrupt aggregation. Lets the backend at least
   * detect (not yet split aggregation by) content drift within a skill_id
   * — see `SkillCategoryMetrics.distinctContentHashCount`.
   */
  skill_content_hash: z.string().length(64),
  account_id: z.string().min(1),
  signature: z.string().min(1),

  size_bucket: sizeBucketSchema,
  isolation_tier: isolationTierSchema,

  with_skill: runOutcomeSchema,
  without_skill: runOutcomeSchema,

  content_opt_in: z.boolean(),
  content_ref: z.string().min(1).nullable(),

  run_id: z.string().min(1),
  order_randomized: z.boolean(),
  timestamp: iso8601Schema,
  claude_version: z.string().min(1).optional(),
  execution: executionSchema.optional(),
  cli_version: z.string().min(1),
  cli_build_hash: z.string().min(1),
};

// ---------------------------------------------------------------------------
// RunResult as a discriminated union by `category`
// ---------------------------------------------------------------------------

const runResultDebuggingSchema = z.object({
  ...sharedFields,
  category: z.literal("debugging"),
  security_delta: securityDeltaSchema,
  category_metrics: categoryMetricsDebuggingSchema,
});

const runResultFeatureSchema = z.object({
  ...sharedFields,
  category: z.literal("feature"),
  security_delta: securityDeltaSchema,
  category_metrics: categoryMetricsDebuggingSchema,
});

const runResultRefactoringSchema = z.object({
  ...sharedFields,
  category: z.literal("refactoring"),
  security_delta: securityDeltaSchema,
  category_metrics: categoryMetricsRefactoringSchema,
});

const runResultDocsSchema = z.object({
  ...sharedFields,
  category: z.literal("docs"),
  // docs is not a code-adjacent category -> security_delta must be null
  security_delta: z.null(),
  category_metrics: categoryMetricsDocsSchema,
});

const runResultMarketingSchema = z.object({
  ...sharedFields,
  category: z.literal("marketing"),
  security_delta: z.null(),
  category_metrics: z.null(),
});

const runResultOtherSchema = z.object({
  ...sharedFields,
  category: z.literal("other"),
  security_delta: z.null(),
  category_metrics: z.null(),
});

export const runResultUnionSchema = z.discriminatedUnion("category", [
  runResultDebuggingSchema,
  runResultFeatureSchema,
  runResultRefactoringSchema,
  runResultDocsSchema,
  runResultMarketingSchema,
  runResultOtherSchema,
]);

/**
 * Complete `RunResult` schema, including the cross-category rule for
 * `content_ref`/`content_opt_in`.
 *
 * The category<->security_delta and category<->category_metrics coupling
 * is already structurally enforced via the discriminated union above.
 */
export const runResultSchema = runResultUnionSchema.superRefine((data, ctx) => {
  if (!data.execution && !data.claude_version) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["execution"], message: "Execution metadata or a legacy Claude version is required" });
  }
  if (data.execution?.agent === "codex" && data.claude_version) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["claude_version"], message: "Codex runs cannot declare a Claude version" });
  }
  if (data.content_ref !== null && data.content_opt_in !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["content_ref"],
      message: "content_ref may only be set when content_opt_in === true",
    });
  }
});
