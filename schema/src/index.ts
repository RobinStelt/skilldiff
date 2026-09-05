// Öffentliche API des Schema-Packages. CLI und Backend importieren
// ausschließlich von hier (siehe README.md) — keine Imports aus tieferen
// Pfaden, damit die interne Struktur frei änderbar bleibt.

export {
  kategorieSchema,
  codeNaheKategorien,
  sizeBucketSchema,
  isolationTierSchema,
  iso8601Schema,
  laufergebnisSchema,
  severityCountsSchema,
  securityDeltaSchema,
  categoryMetricsDebuggingSchema,
  categoryMetricsRefactoringSchema,
  categoryMetricsDokuSchema,
  runResultSchema,
} from "./schema.js";

export type {
  Kategorie,
  SizeBucket,
  IsolationTier,
  Laufergebnis,
  SeverityCounts,
  SecurityDelta,
  CategoryMetricsDebuggingFeature,
  CategoryMetricsRefactoring,
  CategoryMetricsDoku,
  RunResult,
  RunResultDebugging,
  RunResultFeature,
  RunResultRefactoring,
  RunResultDoku,
  RunResultMarketing,
  RunResultSonstige,
} from "./types.js";

export { validateRunResult, isRunResult } from "./validate.js";
export type { ValidationError } from "./validate.js";
