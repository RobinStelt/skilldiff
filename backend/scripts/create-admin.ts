import { Pool } from "pg";
import { loadConfig } from "../src/config.js";
import { hashPassword } from "../src/admin/passwords.js";

/**
 * Deliberately a CLI script, not an HTTP registration endpoint — an open
 * "become an admin" API would defeat the point of admin-only skill
 * catalog curation. Usage:
 *
 *   npx tsx scripts/create-admin.ts <username> <password>
 */
async function main(): Promise<void> {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    throw new Error("usage: create-admin.ts <username> <password>");
  }
  if (password.length < 12) {
    throw new Error("password must be at least 12 characters");
  }

  const config = loadConfig();
  const pool = new Pool({ connectionString: config.appDatabaseUrl });
  try {
    const passwordHash = hashPassword(password);
    await pool.query(
      `INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [username, passwordHash],
    );
    console.log(`admin user "${username}" created/updated`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
