import type { Pool } from "pg";

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
}

export interface AdminUserStore {
  getByUsername(username: string): Promise<AdminUser | null>;
}

export function createPgAdminUserStore(pool: Pool): AdminUserStore {
  return {
    async getByUsername(username) {
      const { rows } = await pool.query(
        `SELECT id, username, password_hash FROM admin_users WHERE username = $1`,
        [username],
      );
      const row = rows[0];
      return row ? { id: row.id, username: row.username, passwordHash: row.password_hash } : null;
    },
  };
}
