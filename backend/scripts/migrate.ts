import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

/**
 * Role passwords ship as literal `change-me-*` placeholders in
 * 001_init.sql (fine for the local dev compose). For a real deployment,
 * substitute real values here via env vars before the SQL runs — the
 * `CREATE ROLE ... IF NOT EXISTS` guard means this only takes effect the
 * first time a fresh database is migrated; it does not rotate an
 * existing role's password on a later run.
 */
const ROLE_PASSWORD_OVERRIDES: Record<string, string | undefined> = {
  "change-me-app-backend": process.env.APP_BACKEND_ROLE_PASSWORD,
  "change-me-content-writer": process.env.CONTENT_WRITER_ROLE_PASSWORD,
  "change-me-blindvoting": process.env.BLINDVOTING_ROLE_PASSWORD,
};

function applyRolePasswordOverrides(sql: string): string {
  let result = sql;
  for (const [placeholder, override] of Object.entries(ROLE_PASSWORD_OVERRIDES)) {
    if (override) {
      result = result.split(placeholder).join(override);
    }
  }
  return result;
}

/**
 * Applies db/migrations/*.sql in filename order against
 * MIGRATION_DATABASE_URL (a superuser/owner connection — the migration
 * itself creates the least-privileged runtime roles). Not tracked in a
 * migrations table yet (single migration so far); every statement is
 * written idempotently (CREATE TABLE IF NOT EXISTS, etc.).
 */
async function main(): Promise<void> {
  const migrationUrl = process.env.MIGRATION_DATABASE_URL;
  if (!migrationUrl) {
    throw new Error("MIGRATION_DATABASE_URL is not set");
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = join(here, "..", "db", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const client = new Client({ connectionString: migrationUrl });
  await client.connect();
  try {
    for (const file of files) {
      const sql = applyRolePasswordOverrides(readFileSync(join(migrationsDir, file), "utf-8"));
      // eslint-disable-next-line no-console
      console.log(`applying ${file}`);
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
