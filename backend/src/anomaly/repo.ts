import type { Pool } from "pg";
import type { RunRecordForAnomalyCheck } from "./detect.js";

export async function fetchRecordsForAnomalyCheck(appPool: Pool): Promise<RunRecordForAnomalyCheck[]> {
  const { rows } = await appPool.query(
    `SELECT run_id, account_id, skill_id, category, with_skill->'success' AS with_skill_success
     FROM run_results`,
  );
  return rows.map((row) => ({
    runId: row.run_id,
    accountId: row.account_id,
    skillId: row.skill_id,
    category: row.category,
    withSkillSuccess: row.with_skill_success,
  }));
}

export async function applyAnomalyFlags(
  appPool: Pool,
  accountFlags: ReadonlyMap<string, string[]>,
  recordFlags: ReadonlyMap<string, string[]>,
): Promise<void> {
  const client = await appPool.connect();
  try {
    await client.query("BEGIN");

    // Reset first — an account/record that no longer trips a check must be
    // un-flagged, not stuck flagged forever from a past scan.
    await client.query(`UPDATE accounts SET flagged = false WHERE flagged = true`);
    await client.query(`UPDATE run_results SET anomaly_flags = '{}' WHERE anomaly_flags <> '{}'`);

    for (const accountId of accountFlags.keys()) {
      await client.query(`UPDATE accounts SET flagged = true WHERE account_id = $1`, [accountId]);
    }
    for (const [runId, reasons] of recordFlags) {
      await client.query(`UPDATE run_results SET anomaly_flags = $2 WHERE run_id = $1`, [runId, reasons]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
