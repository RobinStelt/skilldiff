import type { Category } from "@skilldiff/schema";

export interface RunRecordForAnomalyCheck {
  runId: string;
  accountId: string;
  skillId: string;
  category: Category;
  withSkillSuccess: boolean | null;
}

export const ANOMALY_PERFECT_SUCCESS_HETEROGENEOUS = "perfect_success_heterogeneous_categories";
export const ANOMALY_UPLOAD_BURST_SAME_SKILL = "upload_burst_same_skill";

/** Below this many distinct categories, a 100% success rate isn't suspicious — could be luck or a genuinely easy niche. */
const MIN_DISTINCT_CATEGORIES = 3;
/** Below this many records, not enough signal either way. */
const MIN_RECORDS_FOR_PERFECT_SUCCESS_CHECK = 10;
/** Uploads for the *same* skill from the *same* account beyond this look like gaming, not organic testing (briefing point 5 / acceptance criterion: 50 uploads must trigger). */
const UPLOAD_BURST_THRESHOLD = 20;

/**
 * "Accounts mit auffällig perfekter Erfolgsrate über heterogene Kategorien
 * hinweg markieren" (briefing point 5). Flags per-account, not per-record —
 * every record from a flagged account is still stored and still counted,
 * just down-weighted (never silently dropped, briefing point 5 last line).
 */
export function detectPerfectSuccessAcrossCategories(
  records: readonly RunRecordForAnomalyCheck[],
): Set<string> {
  const byAccount = new Map<string, RunRecordForAnomalyCheck[]>();
  for (const record of records) {
    const list = byAccount.get(record.accountId) ?? [];
    list.push(record);
    byAccount.set(record.accountId, list);
  }

  const flagged = new Set<string>();
  for (const [accountId, accountRecords] of byAccount) {
    if (accountRecords.length < MIN_RECORDS_FOR_PERFECT_SUCCESS_CHECK) continue;
    const distinctCategories = new Set(accountRecords.map((r) => r.category));
    if (distinctCategories.size < MIN_DISTINCT_CATEGORIES) continue;
    const allSucceeded = accountRecords.every((r) => r.withSkillSuccess === true);
    if (allSucceeded) flagged.add(accountId);
  }
  return flagged;
}

/**
 * "Auffällig viele Uploads für denselben Skill vom selben Account markieren"
 * (briefing point 5). Returns the `${accountId}:${skillId}` pairs that
 * cleared the threshold.
 */
export function detectUploadBurstForSameSkill(
  records: readonly RunRecordForAnomalyCheck[],
): Set<string> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = `${record.accountId}:${record.skillId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const flagged = new Set<string>();
  for (const [key, count] of counts) {
    if (count >= UPLOAD_BURST_THRESHOLD) flagged.add(key);
  }
  return flagged;
}

export interface AnomalyFlags {
  /** account_id -> reasons, drives Account.flagged + the reputation penalty. */
  accountFlags: Map<string, string[]>;
  /** run_id -> reasons, stored on the individual record for manual review (Phase 6). */
  recordFlags: Map<string, string[]>;
}

/** Runs both checks and turns the results into flags keyed the way callers need them. */
export function detectAnomalies(records: readonly RunRecordForAnomalyCheck[]): AnomalyFlags {
  const perfectSuccessAccounts = detectPerfectSuccessAcrossCategories(records);
  const burstPairs = detectUploadBurstForSameSkill(records);

  const accountFlags = new Map<string, string[]>();
  const recordFlags = new Map<string, string[]>();

  for (const record of records) {
    const reasons: string[] = [];
    if (perfectSuccessAccounts.has(record.accountId)) reasons.push(ANOMALY_PERFECT_SUCCESS_HETEROGENEOUS);
    if (burstPairs.has(`${record.accountId}:${record.skillId}`)) reasons.push(ANOMALY_UPLOAD_BURST_SAME_SKILL);
    if (reasons.length > 0) recordFlags.set(record.runId, reasons);
  }

  for (const accountId of perfectSuccessAccounts) {
    const reasons = accountFlags.get(accountId) ?? [];
    reasons.push(ANOMALY_PERFECT_SUCCESS_HETEROGENEOUS);
    accountFlags.set(accountId, reasons);
  }
  for (const key of burstPairs) {
    const accountId = key.split(":")[0]!;
    const reasons = accountFlags.get(accountId) ?? [];
    reasons.push(ANOMALY_UPLOAD_BURST_SAME_SKILL);
    accountFlags.set(accountId, reasons);
  }

  return { accountFlags, recordFlags };
}
