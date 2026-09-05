/** Central env access — everything else imports from here, never process.env directly. */
export interface Config {
  port: number;
  appDatabaseUrl: string;
  contentWriterDatabaseUrl: string;
  /** cli_build_hash values treated as "official, unmodified" (briefing point 4). */
  trustedCliBuildHashes: Set<string>;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const appDatabaseUrl = env.APP_DATABASE_URL;
  const contentWriterDatabaseUrl = env.CONTENT_WRITER_DATABASE_URL;
  if (!appDatabaseUrl) throw new Error("APP_DATABASE_URL is not set");
  if (!contentWriterDatabaseUrl) throw new Error("CONTENT_WRITER_DATABASE_URL is not set");

  return {
    port: env.PORT ? Number(env.PORT) : 3000,
    appDatabaseUrl,
    contentWriterDatabaseUrl,
    trustedCliBuildHashes: new Set(
      (env.TRUSTED_CLI_BUILD_HASHES ?? "")
        .split(",")
        .map((hash) => hash.trim())
        .filter((hash) => hash.length > 0),
    ),
  };
}
