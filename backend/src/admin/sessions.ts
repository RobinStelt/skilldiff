import { randomBytes, createHash } from "node:crypto";
import type { Pool } from "pg";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface AdminSessionStore {
  /** Returns the raw token — this is the ONLY time it's ever seen; only its hash is stored. */
  create(adminUserId: string): Promise<{ token: string; expiresAt: Date }>;
  /** `null` for a missing/expired/revoked session — callers must treat all three identically. */
  verify(token: string): Promise<{ adminUserId: string } | null>;
  revoke(token: string): Promise<void>;
}

export function createPgAdminSessionStore(pool: Pool): AdminSessionStore {
  return {
    async create(adminUserId) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await pool.query(
        `INSERT INTO admin_sessions (token_hash, admin_user_id, expires_at) VALUES ($1, $2, $3)`,
        [hashToken(token), adminUserId, expiresAt],
      );
      return { token, expiresAt };
    },

    async verify(token) {
      const { rows } = await pool.query(
        `SELECT admin_user_id FROM admin_sessions WHERE token_hash = $1 AND expires_at > now()`,
        [hashToken(token)],
      );
      return rows[0] ? { adminUserId: rows[0].admin_user_id } : null;
    },

    async revoke(token) {
      await pool.query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [hashToken(token)]);
    },
  };
}
