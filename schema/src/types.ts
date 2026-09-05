import type { z } from "zod";
import type {
  kategorieSchema,
  sizeBucketSchema,
  isolationTierSchema,
  laufergebnisSchema,
  severityCountsSchema,
  securityDeltaSchema,
  categoryMetricsDebuggingSchema,
  categoryMetricsRefactoringSchema,
  categoryMetricsDokuSchema,
  runResultSchema,
} from "./schema.js";

export type Kategorie = z.infer<typeof kategorieSchema>;
export type SizeBucket = z.infer<typeof sizeBucketSchema>;
export type IsolationTier = z.infer<typeof isolationTierSchema>;
export type Laufergebnis = z.infer<typeof laufergebnisSchema>;
export type SeverityCounts = z.infer<typeof severityCountsSchema>;
export type SecurityDelta = z.infer<typeof securityDeltaSchema>;

export type CategoryMetricsDebuggingFeature = z.infer<typeof categoryMetricsDebuggingSchema>;
export type CategoryMetricsRefactoring = z.infer<typeof categoryMetricsRefactoringSchema>;
export type CategoryMetricsDoku = z.infer<typeof categoryMetricsDokuSchema>;

/**
 * Haupttyp. Diskriminierte Union nach `category` — TypeScript engt
 * `category_metrics` (und `security_delta`) beim Narrowing auf `category`
 * automatisch auf die passende Variante ein.
 */
export type RunResult = z.infer<typeof runResultSchema>;

// Bequeme, nach Kategorie ausdiskriminierte Einzeltypen für Call-Sites,
// die von vornherein wissen, mit welcher Kategorie sie arbeiten.
export type RunResultDebugging = Extract<RunResult, { category: "debugging" }>;
export type RunResultFeature = Extract<RunResult, { category: "feature" }>;
export type RunResultRefactoring = Extract<RunResult, { category: "refactoring" }>;
export type RunResultDoku = Extract<RunResult, { category: "doku" }>;
export type RunResultMarketing = Extract<RunResult, { category: "marketing" }>;
export type RunResultSonstige = Extract<RunResult, { category: "sonstige" }>;
