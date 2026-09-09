// Public API of the schema package. CLI and backend import exclusively
// from here (see README.md) — never from deeper paths, so the internal
// structure stays free to change.

export {
  categorySchema,
  codeAdjacentCategories,
  sizeBucketSchema,
  isolationTierSchema,
  iso8601Schema,
  runOutcomeSchema,
  severityCountsSchema,
  securityDeltaSchema,
  categoryMetricsDebuggingSchema,
  categoryMetricsRefactoringSchema,
  categoryMetricsDocsSchema,
  runResultSchema,
} from "./schema.js";

export type {
  Category,
  SizeBucket,
  IsolationTier,
  RunOutcome,
  SeverityCounts,
  SecurityDelta,
  CategoryMetricsDebuggingFeature,
  CategoryMetricsRefactoring,
  CategoryMetricsDocs,
  RunResult,
  RunResultDebugging,
  RunResultFeature,
  RunResultRefactoring,
  RunResultDocs,
  RunResultMarketing,
  RunResultOther,
} from "./types.js";

export { validateRunResult, isRunResult } from "./validate.js";
export type { ValidationError } from "./validate.js";

export { canonicalJson } from "./canonicalJson.js";
export { agentSchema, executionSchema, legacyExecution, executionKey, matchesExecution } from "./execution.js";
export type { Agent, Execution, ExecutionFilter } from "./execution.js";
