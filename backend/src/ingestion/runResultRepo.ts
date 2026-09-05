import type { Pool } from "pg";
import type { RunResult } from "@marktplatz/schema";

export interface RunResultRepo {
  /** Idempotency guard — a retried upload of the same run_id must not double-count. */
  exists(runId: string): Promise<boolean>;
  insert(runResult: RunResult, weight: number, anomalyFlags: readonly string[]): Promise<void>;
}

export function createPgRunResultRepo(appPool: Pool): RunResultRepo {
  return {
    async exists(runId) {
      const { rows } = await appPool.query(`SELECT 1 FROM run_results WHERE run_id = $1`, [runId]);
      return rows.length > 0;
    },

    async insert(runResult, weight, anomalyFlags) {
      await appPool.query(
        `INSERT INTO run_results (
           run_id, account_id, skill_id, category, size_bucket, isolation_tier,
           order_randomized, run_timestamp, claude_version, cli_version, cli_build_hash,
           content_opt_in, has_content_ref, with_skill, without_skill, security_delta,
           category_metrics, weight, anomaly_flags
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10, $11,
           $12, $13, $14, $15, $16,
           $17, $18, $19
         )`,
        [
          runResult.run_id,
          runResult.account_id,
          runResult.skill_id,
          runResult.category,
          runResult.size_bucket,
          runResult.isolation_tier,
          runResult.order_randomized,
          runResult.timestamp,
          runResult.claude_version,
          runResult.cli_version,
          runResult.cli_build_hash,
          runResult.content_opt_in,
          runResult.content_ref !== null,
          JSON.stringify(runResult.with_skill),
          JSON.stringify(runResult.without_skill),
          runResult.security_delta !== null ? JSON.stringify(runResult.security_delta) : null,
          runResult.category_metrics !== null ? JSON.stringify(runResult.category_metrics) : null,
          weight,
          anomalyFlags,
        ],
      );
    },
  };
}
