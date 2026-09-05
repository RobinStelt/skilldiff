import { randomUUID } from "node:crypto";
import type { IsolationTier, Kategorie, Laufergebnis, RunResult, SecurityDelta, SizeBucket } from "@marktplatz/schema";
import { signiere } from "./upload/signature.js";

export interface BuildRunResultParams {
  skillId: string;
  accountId: string;
  signingSecret: string;
  kategorie: Kategorie;
  sizeBucket: SizeBucket;
  isolationTier: IsolationTier;
  mitSkillLaufergebnis: Laufergebnis;
  ohneSkillLaufergebnis: Laufergebnis;
  securityDelta: SecurityDelta;
  mitSkillMetrics: Record<string, unknown> | null;
  ohneSkillMetrics: Record<string, unknown> | null;
  contentOptIn: boolean;
  contentRef: string | null;
  reihenfolgeRandomisiert: boolean;
  claudeVersion: string;
  cliVersion: string;
  cliBuildHash: string;
}

/**
 * Baut das vollständige, aber noch UNSIGNIERTE Payload-Objekt. Getrennt von
 * `buildRunResult`, damit die Signatur exakt über die Felder läuft, die
 * tatsächlich übertragen werden (Signatur selbst ist logischerweise nicht
 * Teil ihrer eigenen Berechnungsgrundlage).
 */
function baueUnsigniertesPayload(p: BuildRunResultParams): Omit<RunResult, "signature"> {
  const gemeinsam = {
    skill_id: p.skillId,
    account_id: p.accountId,
    size_bucket: p.sizeBucket,
    isolation_tier: p.isolationTier,
    mit_skill: p.mitSkillLaufergebnis,
    ohne_skill: p.ohneSkillLaufergebnis,
    content_opt_in: p.contentOptIn,
    content_ref: p.contentRef,
    run_id: randomUUID(),
    reihenfolge_randomisiert: p.reihenfolgeRandomisiert,
    timestamp: new Date().toISOString(),
    claude_version: p.claudeVersion,
    cli_version: p.cliVersion,
    cli_build_hash: p.cliBuildHash,
  };

  switch (p.kategorie) {
    case "debugging":
      return { ...gemeinsam, category: "debugging", security_delta: p.securityDelta, category_metrics: { mit_skill: p.mitSkillMetrics, ohne_skill: p.ohneSkillMetrics } } as Omit<RunResult, "signature">;
    case "feature":
      return { ...gemeinsam, category: "feature", security_delta: p.securityDelta, category_metrics: { mit_skill: p.mitSkillMetrics, ohne_skill: p.ohneSkillMetrics } } as Omit<RunResult, "signature">;
    case "refactoring":
      return { ...gemeinsam, category: "refactoring", security_delta: p.securityDelta, category_metrics: { mit_skill: p.mitSkillMetrics, ohne_skill: p.ohneSkillMetrics } } as Omit<RunResult, "signature">;
    case "doku":
      return { ...gemeinsam, category: "doku", security_delta: null, category_metrics: { mit_skill: p.mitSkillMetrics, ohne_skill: p.ohneSkillMetrics } } as Omit<RunResult, "signature">;
    case "marketing":
      return { ...gemeinsam, category: "marketing", security_delta: null, category_metrics: null };
    case "sonstige":
      return { ...gemeinsam, category: "sonstige", security_delta: null, category_metrics: null };
  }
}

export function buildRunResult(p: BuildRunResultParams): RunResult {
  const unsigniert = baueUnsigniertesPayload(p);
  const signature = signiere(unsigniert as Record<string, unknown>, p.signingSecret);
  return { ...unsigniert, signature } as RunResult;
}
