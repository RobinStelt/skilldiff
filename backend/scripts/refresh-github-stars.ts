import { Pool } from "pg";
import { loadConfig } from "../src/config.js";
import { createPgSkillMetadataStore } from "../src/admin/skillMetadataStore.js";
import { fetchGithubStars } from "../src/admin/githubStars.js";

/** Periodic batch job (cron on the VPS) — see src/admin/githubStars.ts for why this isn't fetched live per request. */
async function main(): Promise<void> {
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.appDatabaseUrl });
  try {
    const store = createPgSkillMetadataStore(pool);
    const skills = await store.listAll();
    let updated = 0;
    for (const skill of skills) {
      if (!skill.githubUrl) continue;
      const stars = await fetchGithubStars(skill.githubUrl);
      if (stars === null) {
        console.warn(`could not fetch stars for ${skill.skillId} (${skill.githubUrl})`);
        continue;
      }
      await store.setGithubStars(skill.skillId, stars, new Date());
      updated += 1;
    }
    console.log(`updated github_stars for ${updated}/${skills.length} cataloged skills`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
