import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

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
      const sql = readFileSync(join(migrationsDir, file), "utf-8");
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
