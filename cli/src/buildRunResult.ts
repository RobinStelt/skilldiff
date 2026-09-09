import type { Execution } from "@skilldiff/schema";
import { randomUUID } from "node:crypto";
import type { Category, IsolationTier, RunOutcome, RunResult, SecurityDelta, SizeBucket } from "@skilldiff/schema";
import { sign } from "./upload/signature.js";

export interface BuildRunResultParams {
  skillId: string;
  /** sha256 (hex) of the skill source directory at run time — see skill/contentHash.ts and schema/src/schema.ts. */
  skillContentHash: string;
  accountId: string;
  signingSecret: string;
  category: Category;
  sizeBucket: SizeBucket;
  isolationTier: IsolationTier;
  withSkillRunOutcome: RunOutcome;
  withoutSkillRunOutcome: RunOutcome;
  securityDelta: SecurityDelta;
  withSkillMetrics: Record<string, unknown> | null;
  withoutSkillMetrics: Record<string, unknown> | null;
  contentOptIn: boolean;
  contentRef: string | null;
  orderRandomized: boolean;
  claudeVersion?: string;
  execution?: Execution;
  cliVersion: string;
  cliBuildHash: string;
}

/**
 * Builds the complete but still UNSIGNED payload object. Kept separate
 * from `buildRunResult` so the signature runs exactly over the fields that
 * are actually transmitted (the signature itself obviously isn't part of
 * its own calculation base).
 */
function buildUnsignedPayload(p: BuildRunResultParams): Omit<RunResult, "signature"> {
  const shared = {
    skill_id: p.skillId,
    skill_content_hash: p.skillContentHash,
    account_id: p.accountId,
    size_bucket: p.sizeBucket,
    isolation_tier: p.isolationTier,
    with_skill: p.withSkillRunOutcome,
    without_skill: p.withoutSkillRunOutcome,
    content_opt_in: p.contentOptIn,
    content_ref: p.contentRef,
    run_id: randomUUID(),
    order_randomized: p.orderRandomized,
    timestamp: new Date().toISOString(),
    ...(p.claudeVersion ? { claude_version: p.claudeVersion } : {}),
    ...(p.execution ? { execution: p.execution } : {}),
    cli_version: p.cliVersion,
    cli_build_hash: p.cliBuildHash,
  };

  switch (p.category) {
    case "debugging":
      return { ...shared, category: "debugging", security_delta: p.securityDelta, category_metrics: { with_skill: p.withSkillMetrics, without_skill: p.withoutSkillMetrics } } as Omit<RunResult, "signature">;
    case "feature":
      return { ...shared, category: "feature", security_delta: p.securityDelta, category_metrics: { with_skill: p.withSkillMetrics, without_skill: p.withoutSkillMetrics } } as Omit<RunResult, "signature">;
    case "refactoring":
      return { ...shared, category: "refactoring", security_delta: p.securityDelta, category_metrics: { with_skill: p.withSkillMetrics, without_skill: p.withoutSkillMetrics } } as Omit<RunResult, "signature">;
    case "docs":
      return { ...shared, category: "docs", security_delta: null, category_metrics: { with_skill: p.withSkillMetrics, without_skill: p.withoutSkillMetrics } } as Omit<RunResult, "signature">;
    case "marketing":
      return { ...shared, category: "marketing", security_delta: null, category_metrics: null };
    case "other":
      return { ...shared, category: "other", security_delta: null, category_metrics: null };
  }
}

export function buildRunResult(p: BuildRunResultParams): RunResult {
  const unsigned = buildUnsignedPayload(p);
  const signature = sign(unsigned as Record<string, unknown>, p.signingSecret);
  return { ...unsigned, signature } as RunResult;
}
