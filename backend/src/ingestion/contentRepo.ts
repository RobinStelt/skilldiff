import type { Pool } from "pg";

export interface ContentRepo {
  insert(runId: string, contentRef: string): Promise<void>;
}

/**
 * Uses the `content_writer` pool exclusively (see src/db/pools.ts) — this
 * is the ONLY place in the codebase allowed to touch run_result_content.
 * The role backing this pool has INSERT-only rights; there is no read path
 * back out of this table anywhere in the general backend.
 */
export function createPgContentRepo(contentWriterPool: Pool): ContentRepo {
  return {
    async insert(runId, contentRef) {
      await contentWriterPool.query(
        `INSERT INTO run_result_content (run_id, content_ref) VALUES ($1, $2)`,
        [runId, contentRef],
      );
    },
  };
}
