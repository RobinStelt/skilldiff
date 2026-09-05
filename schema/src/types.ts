import type { z } from "zod";
import type {
  categorySchema,
  sizeBucketSchema,
  isolationTierSchema,
  runOutcomeSchema,
  severityCountsSchema,
  securityDeltaSchema,
  categoryMetricsDebuggingSchema,
  categoryMetricsRefactoringSchema,
  categoryMetricsDocsSchema,
  runResultSchema,
} from "./schema.js";

export type Category = z.infer<typeof categorySchema>;
export type SizeBucket = z.infer<typeof sizeBucketSchema>;
export type IsolationTier = z.infer<typeof isolationTierSchema>;
export type RunOutcome = z.infer<typeof runOutcomeSchema>;
export type SeverityCounts = z.infer<typeof severityCountsSchema>;
export type SecurityDelta = z.infer<typeof securityDeltaSchema>;

export type CategoryMetricsDebuggingFeature = z.infer<typeof categoryMetricsDebuggingSchema>;
export type CategoryMetricsRefactoring = z.infer<typeof categoryMetricsRefactoringSchema>;
export type CategoryMetricsDocs = z.infer<typeof categoryMetricsDocsSchema>;

/**
 * Main type. Discriminated union by `category` — TypeScript narrows
 * `category_metrics` (and `security_delta`) to the matching variant
 * automatically once `category` is narrowed.
 */
export type RunResult = z.infer<typeof runResultSchema>;

// Convenient, per-category discriminated types for call sites that already
// know which category they're working with.
export type RunResultDebugging = Extract<RunResult, { category: "debugging" }>;
export type RunResultFeature = Extract<RunResult, { category: "feature" }>;
export type RunResultRefactoring = Extract<RunResult, { category: "refactoring" }>;
export type RunResultDocs = Extract<RunResult, { category: "docs" }>;
export type RunResultMarketing = Extract<RunResult, { category: "marketing" }>;
export type RunResultOther = Extract<RunResult, { category: "other" }>;
