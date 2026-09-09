import { loadConfig } from "./config.js";
import { createPools } from "./db/pools.js";
import { createPgAccountStore } from "./accounts/accountStore.js";
import { createPgRunResultRepo } from "./ingestion/runResultRepo.js";
import { createPgContentRepo } from "./ingestion/contentRepo.js";
import { getSkillMetrics } from "./api/skillMetrics.js";
import { getAllSkillMetrics } from "./api/export.js";
import { getRawExportRecords, getSkillDetail, listSkills } from "./api/publicApi.js";
import { createPgAdminUserStore } from "./admin/adminUserStore.js";
import { createPgAdminSessionStore } from "./admin/sessions.js";
import { createPgSkillMetadataStore } from "./admin/skillMetadataStore.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const pools = createPools(config);
  const skillMetadataStore = createPgSkillMetadataStore(pools.app);

  const app = buildApp({
    accountStore: createPgAccountStore(pools.app),
    runResultRepo: createPgRunResultRepo(pools.app),
    contentRepo: createPgContentRepo(pools.contentWriter),
    trustedHashes: config.trustedCliBuildHashes,
    getSkillMetrics: (skillId) => getSkillMetrics(pools.app, skillId),
    getAllSkillMetrics: () => getAllSkillMetrics(pools.app),
    listSkills: (options) => listSkills(pools.app, skillMetadataStore, options),
    getSkillDetail: (skillId, filter) => getSkillDetail(pools.app, skillMetadataStore, skillId, config.aggregationSourceUrl, filter),
    getRawExportRecords: (skillId, category, filter) => getRawExportRecords(pools.app, skillId, category, filter),
    adminUserStore: createPgAdminUserStore(pools.app),
    sessionStore: createPgAdminSessionStore(pools.app),
    skillMetadataStore,
  });

  const shutdown = async () => {
    await app.close();
    await pools.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: config.port, host: "0.0.0.0" });
  // eslint-disable-next-line no-console
  console.log(`backend listening on :${config.port}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
