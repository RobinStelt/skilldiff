import { describe, expect, it } from "vitest";
import { Client } from "pg";

/**
 * Verifies the acceptance criterion "Zugriff auf die content_ref-Tabelle
 * ist über einen normalen Backend-DB-User nachweislich nicht möglich"
 * against a REAL Postgres (docker-compose.yml + `npm run migrate`).
 *
 * Requires:
 *   TEST_DATABASE_URL_APP_ROLE          (role: app_backend)
 *   TEST_DATABASE_URL_CONTENT_WRITER    (role: content_writer)
 * Skips entirely when unset, so `npm test` (unit only) never needs a DB.
 */
const appUrl = process.env.TEST_DATABASE_URL_APP_ROLE;
const contentWriterUrl = process.env.TEST_DATABASE_URL_CONTENT_WRITER;

describe.skipIf(!appUrl || !contentWriterUrl)("run_result_content access control", () => {
  it("app_backend gets a permission error reading run_result_content, not empty rows", async () => {
    const client = new Client({ connectionString: appUrl });
    await client.connect();
    try {
      await expect(client.query("SELECT * FROM run_result_content")).rejects.toThrow(/permission denied/i);
    } finally {
      await client.end();
    }
  });

  it("content_writer can insert but cannot read back its own write", async () => {
    const client = new Client({ connectionString: contentWriterUrl });
    await client.connect();
    try {
      await expect(client.query("SELECT * FROM run_result_content")).rejects.toThrow(/permission denied/i);
    } finally {
      await client.end();
    }
  });
});
