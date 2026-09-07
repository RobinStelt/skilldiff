/** Central env access — everything else imports from here, never process.env directly. */
export interface Config {
  port: number;
  appDatabaseUrl: string;
  /**
   * Optional here on purpose: only db/pools.ts's createPools() (used by
   * server.ts, the real backend process) actually needs it. Making it
   * required in loadConfig() itself meant every one-off admin script
   * (create-admin.ts, mark-seed-account.ts, refresh-github-stars.ts,
   * import-skill-metadata.ts, run-anomaly-scan.ts — none of which ever
   * touch the content-writer pool) failed with "CONTENT_WRITER_DATABASE_URL
   * is not set" even with APP_DATABASE_URL correctly set — reproduced for
   * real running root README.md's own documented create-admin.ts command
   * against a fresh deployment.
   */
  contentWriterDatabaseUrl: string | undefined;
  /** cli_build_hash values treated as "official, unmodified" (briefing point 4). */
  trustedCliBuildHashes: Set<string>;
  /** Points at the aggregation source on GitHub (briefing 05 point 6) — update once the repo has a real remote. */
  aggregationSourceUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const appDatabaseUrl = env.APP_DATABASE_URL;
  if (!appDatabaseUrl) throw new Error("APP_DATABASE_URL is not set");

  return {
    port: env.PORT ? Number(env.PORT) : 3000,
    appDatabaseUrl,
    contentWriterDatabaseUrl: env.CONTENT_WRITER_DATABASE_URL,
    trustedCliBuildHashes: new Set(
      (env.TRUSTED_CLI_BUILD_HASHES ?? "")
        .split(",")
        .map((hash) => hash.trim())
        .filter((hash) => hash.length > 0),
    ),
    aggregationSourceUrl:
      env.AGGREGATION_SOURCE_URL ?? "https://github.com/example-org/marktplatz/tree/main/backend/src/aggregation",
  };
}
