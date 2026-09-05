import { Pool } from "pg";
import { loadConfig } from "../src/config.js";
import { createPgAccountStore } from "../src/accounts/accountStore.js";

/**
 * Admin-only CLI, not an HTTP endpoint — marks (or unmarks) an account as
 * the known Phase-5 pre-fill account (briefing 06 point 4). Usage:
 *
 *   npx tsx scripts/mark-seed-account.ts <account_id> [--unset]
 */
async function main(): Promise<void> {
  const [accountId, flag] = process.argv.slice(2);
  if (!accountId) {
    throw new Error("usage: mark-seed-account.ts <account_id> [--unset]");
  }
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.appDatabaseUrl });
  try {
    const accountStore = createPgAccountStore(pool);
    const account = await accountStore.get(accountId);
    if (!account) {
      throw new Error(`account ${accountId} is not registered (POST /v1/accounts first)`);
    }
    await accountStore.setSeedAccount(accountId, flag !== "--unset");
    console.log(`${accountId}: is_seed_account = ${flag !== "--unset"}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
