import { Pool } from "pg";
import type { Config } from "../config.js";

/**
 * Two separate connection pools with separate DB roles — NOT a stylistic
 * choice. `appPool` (role `app_backend`) has no grant at all on
 * `run_result_content` (db/migrations/001_init.sql), so every code path
 * that uses it structurally cannot read plaintext opt-in content, no
 * matter what the application code does. Only `contentWriterPool` (role
 * `content_writer`, INSERT-only) may touch that table, and only
 * src/ingestion/persist.ts is allowed to use it.
 */
export interface DbPools {
  app: Pool;
  contentWriter: Pool;
  close(): Promise<void>;
}

export function createPools(config: Config): DbPools {
  const app = new Pool({ connectionString: config.appDatabaseUrl });
  const contentWriter = new Pool({ connectionString: config.contentWriterDatabaseUrl });
  return {
    app,
    contentWriter,
    async close() {
      await Promise.all([app.end(), contentWriter.end()]);
    },
  };
}
