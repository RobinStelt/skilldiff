import { Pool } from "pg";
import { loadConfig } from "../src/config.js";
import { runAnomalyScan } from "../src/anomaly/scan.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.appDatabaseUrl });
  try {
    const result = await runAnomalyScan(pool);
    console.log(`anomaly scan done: ${result.flaggedAccounts} accounts, ${result.flaggedRecords} records flagged`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
