import type { Pool } from "pg";
import { timingSafeEqual } from "node:crypto";

export interface Account {
  accountId: string;
  signingSecret: string;
  createdAt: Date;
  uploadCount: number;
  flagged: boolean;
}

export type RegisterStatus = "created" | "already_registered_same_secret" | "already_registered_different_secret";

export interface RegisterResult {
  account: Account;
  status: RegisterStatus;
}

export interface AccountStore {
  /**
   * Explicit registration step (POST /v1/accounts) — see the note in
   * src/canonical.ts and the discussion with the user: HMAC verification
   * requires the backend to know the secret, so it must be sent once,
   * deliberately, over HTTPS. This is NOT trust-on-first-use-from-an-
   * upload (that's cryptographically impossible for HMAC — a signature
   * alone never reveals the secret that produced it). Re-registering an
   * already-known account_id with a *different* secret is reported but
   * NOT applied — an existing account's key can't be silently overwritten
   * by whoever gets there first with a new secret.
   */
  register(accountId: string, signingSecret: string): Promise<RegisterResult>;
  incrementUploadCount(accountId: string): Promise<void>;
  setFlagged(accountId: string, flagged: boolean): Promise<void>;
  get(accountId: string): Promise<Account | null>;
}

function rowToAccount(row: {
  account_id: string;
  signing_secret: string;
  created_at: Date;
  upload_count: number;
  flagged: boolean;
}): Account {
  return {
    accountId: row.account_id,
    signingSecret: row.signing_secret,
    createdAt: row.created_at,
    uploadCount: row.upload_count,
    flagged: row.flagged,
  };
}

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createPgAccountStore(pool: Pool): AccountStore {
  return {
    async register(accountId, signingSecret) {
      // Atomic creation: ON CONFLICT DO NOTHING + RETURNING tells us
      // whether *this* call created the row, closing the race between
      // concurrent first-registrations of the same brand-new account_id.
      const inserted = await pool.query(
        `INSERT INTO accounts (account_id, signing_secret)
         VALUES ($1, $2)
         ON CONFLICT (account_id) DO NOTHING
         RETURNING account_id, signing_secret, created_at, upload_count, flagged`,
        [accountId, signingSecret],
      );
      if (inserted.rows[0]) {
        return { account: rowToAccount(inserted.rows[0]), status: "created" };
      }
      const { rows } = await pool.query(
        `SELECT account_id, signing_secret, created_at, upload_count, flagged
         FROM accounts WHERE account_id = $1`,
        [accountId],
      );
      const row = rows[0];
      if (!row) throw new Error(`account ${accountId} vanished between insert and read`);
      const account = rowToAccount(row);
      return {
        account,
        status: secretsMatch(account.signingSecret, signingSecret)
          ? "already_registered_same_secret"
          : "already_registered_different_secret",
      };
    },

    async incrementUploadCount(accountId) {
      await pool.query(`UPDATE accounts SET upload_count = upload_count + 1 WHERE account_id = $1`, [
        accountId,
      ]);
    },

    async setFlagged(accountId, flagged) {
      await pool.query(`UPDATE accounts SET flagged = $2 WHERE account_id = $1`, [accountId, flagged]);
    },

    async get(accountId) {
      const { rows } = await pool.query(
        `SELECT account_id, signing_secret, created_at, upload_count, flagged
         FROM accounts WHERE account_id = $1`,
        [accountId],
      );
      return rows[0] ? rowToAccount(rows[0]) : null;
    },
  };
}

/** In-memory implementation for unit tests — no Postgres needed. */
export function createInMemoryAccountStore(seed: Account[] = []): AccountStore {
  const accounts = new Map(seed.map((account) => [account.accountId, account]));
  return {
    async register(accountId, signingSecret) {
      const existing = accounts.get(accountId);
      if (!existing) {
        const account: Account = { accountId, signingSecret, createdAt: new Date(), uploadCount: 0, flagged: false };
        accounts.set(accountId, account);
        return { account, status: "created" };
      }
      return {
        account: existing,
        status: secretsMatch(existing.signingSecret, signingSecret)
          ? "already_registered_same_secret"
          : "already_registered_different_secret",
      };
    },
    async incrementUploadCount(accountId) {
      const account = accounts.get(accountId);
      if (account) account.uploadCount += 1;
    },
    async setFlagged(accountId, flagged) {
      const account = accounts.get(accountId);
      if (account) account.flagged = flagged;
    },
    async get(accountId) {
      return accounts.get(accountId) ?? null;
    },
  };
}
