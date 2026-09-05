import { z } from "zod";

/**
 * Single Source of Truth für das Datenschema aus Abschnitt 4 des Projektplans
 * (`skill-ab-marktplatz-plan.md`). TypeScript-Typen werden per `z.infer<>`
 * abgeleitet (siehe `types.ts`), das JSON-Schema für die Backend-Laufzeit-
 * validierung per `zod-to-json-schema` exportiert (siehe `scripts/export-json-schema.ts`).
 *
 * Kein `RegressionCheck`-Typ — Regressions-Nachcheck ist bewusst kein Teil
 * des Projekts (Plan, Abschnitt 4 & 8).
 */

// ---------------------------------------------------------------------------
// Kleinbausteine
// ---------------------------------------------------------------------------

export const kategorieSchema = z.enum([
  "debugging",
  "feature",
  "doku",
  "refactoring",
  "marketing",
  "sonstige",
]);

/** Kategorien, für die ein Code-Artefakt entsteht und `security_delta` befüllt sein darf. */
export const codeNaheKategorien = ["debugging", "feature", "refactoring"] as const;

export const sizeBucketSchema = z.enum(["klein", "mittel", "groß"]);

export const isolationTierSchema = z.enum(["A", "B", "C"]);

/** ISO-8601-Zeitstempel, z.B. "2026-09-05T12:34:56Z". */
export const iso8601Schema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "timestamp muss ein gültiger ISO8601-Zeitstempel sein",
  });

const nichtNegativeInt = z.number().int().nonnegative();

export const laufergebnisSchema = z.object({
  erfolg: z.boolean().nullable(),
  tokens: nichtNegativeInt,
  dauer_sek: nichtNegativeInt,
});

export const severityCountsSchema = z.object({
  kritisch: nichtNegativeInt,
  hoch: nichtNegativeInt,
  mittel: nichtNegativeInt,
  niedrig: nichtNegativeInt,
});

export const securityDeltaSchema = z
  .object({
    mit_skill: severityCountsSchema,
    ohne_skill: severityCountsSchema,
  })
  .nullable();

// ---------------------------------------------------------------------------
// category_metrics — diskriminierte Union nach `category` (Plan, Abschnitt 4, Tabelle)
// ---------------------------------------------------------------------------

const ciStatusSchema = z.enum(["pass", "fail", "n/a"]);

/** debugging & feature teilen sich dieselben Zusatzmetriken. */
const debuggingFeatureMetricsSchema = z.object({
  test_coverage_pct: z.number().min(0).max(100),
  lint_errors: nichtNegativeInt,
  ci_status: ciStatusSchema,
});

const refactoringMetricsSchema = z.object({
  cyclomatic_complexity_before: z.number().nonnegative(),
  cyclomatic_complexity_after: z.number().nonnegative(),
  diff_size_loc: nichtNegativeInt,
});

const dokuMetricsSchema = z.object({
  readability_score: z.number(),
});

function paarSchema<T extends z.ZodTypeAny>(metrikSchema: T) {
  return z.object({
    mit_skill: metrikSchema,
    ohne_skill: metrikSchema,
  });
}

export const categoryMetricsDebuggingSchema = paarSchema(debuggingFeatureMetricsSchema);
export const categoryMetricsRefactoringSchema = paarSchema(refactoringMetricsSchema);
export const categoryMetricsDokuSchema = paarSchema(dokuMetricsSchema);

// ---------------------------------------------------------------------------
// Gemeinsame Felder aller RunResult-Varianten (alles außer category & category_metrics)
// ---------------------------------------------------------------------------

const gemeinsameFelder = {
  skill_id: z.string().min(1),
  account_id: z.string().min(1),
  signature: z.string().min(1),

  size_bucket: sizeBucketSchema,
  isolation_tier: isolationTierSchema,

  mit_skill: laufergebnisSchema,
  ohne_skill: laufergebnisSchema,

  content_opt_in: z.boolean(),
  content_ref: z.string().min(1).nullable(),

  run_id: z.string().min(1),
  reihenfolge_randomisiert: z.boolean(),
  timestamp: iso8601Schema,
  claude_version: z.string().min(1),
  cli_version: z.string().min(1),
  cli_build_hash: z.string().min(1),
};

// ---------------------------------------------------------------------------
// RunResult als diskriminierte Union nach `category`
// ---------------------------------------------------------------------------

const runResultDebuggingSchema = z.object({
  ...gemeinsameFelder,
  category: z.literal("debugging"),
  security_delta: securityDeltaSchema,
  category_metrics: categoryMetricsDebuggingSchema,
});

const runResultFeatureSchema = z.object({
  ...gemeinsameFelder,
  category: z.literal("feature"),
  security_delta: securityDeltaSchema,
  category_metrics: categoryMetricsDebuggingSchema,
});

const runResultRefactoringSchema = z.object({
  ...gemeinsameFelder,
  category: z.literal("refactoring"),
  security_delta: securityDeltaSchema,
  category_metrics: categoryMetricsRefactoringSchema,
});

const runResultDokuSchema = z.object({
  ...gemeinsameFelder,
  category: z.literal("doku"),
  // doku ist keine code-nahe Kategorie -> security_delta muss null sein
  security_delta: z.null(),
  category_metrics: categoryMetricsDokuSchema,
});

const runResultMarketingSchema = z.object({
  ...gemeinsameFelder,
  category: z.literal("marketing"),
  security_delta: z.null(),
  category_metrics: z.null(),
});

const runResultSonstigeSchema = z.object({
  ...gemeinsameFelder,
  category: z.literal("sonstige"),
  security_delta: z.null(),
  category_metrics: z.null(),
});

export const runResultUnionSchema = z.discriminatedUnion("category", [
  runResultDebuggingSchema,
  runResultFeatureSchema,
  runResultRefactoringSchema,
  runResultDokuSchema,
  runResultMarketingSchema,
  runResultSonstigeSchema,
]);

/**
 * Vollständiges `RunResult`-Schema inklusive der kategorieübergreifenden
 * Cross-Field-Regel für `content_ref`/`content_opt_in`.
 *
 * Die category<->security_delta- und category<->category_metrics-Kopplung
 * ist bereits über die diskriminierte Union oben strukturell erzwungen.
 */
export const runResultSchema = runResultUnionSchema.superRefine((data, ctx) => {
  if (data.content_ref !== null && data.content_opt_in !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["content_ref"],
      message: "content_ref darf nur gesetzt sein, wenn content_opt_in === true",
    });
  }
});
