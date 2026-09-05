import type { Pool } from "pg";
import { detectAnomalies } from "./detect.js";
import { applyAnomalyFlags, fetchRecordsForAnomalyCheck } from "./repo.js";

/**
 * Periodic batch job (run via scripts/run-anomaly-scan.ts, e.g. cron on the
 * VPS) — recomputes anomaly flags over the whole dataset. Flags lower an
 * account's reputation weight (src/aggregation/weighting.ts reads
 * Account.flagged) and mark individual records for manual review (briefing
 * point 5); nothing is ever deleted here.
 */
export async function runAnomalyScan(appPool: Pool): Promise<{ flaggedAccounts: number; flaggedRecords: number }> {
  const records = await fetchRecordsForAnomalyCheck(appPool);
  const { accountFlags, recordFlags } = detectAnomalies(records);
  await applyAnomalyFlags(appPool, accountFlags, recordFlags);
  return { flaggedAccounts: accountFlags.size, flaggedRecords: recordFlags.size };
}
