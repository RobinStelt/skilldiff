import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { loadConfig } from "../src/config.js";
import { parseGithubRepo } from "../src/admin/githubStars.js";

/** Imports reviewed metadata without overwriting any existing admin edits. */
async function main(): Promise<void> {
  const inputPath = process.argv[2] ?? new URL("../data/seed-skill-metadata.json", import.meta.url);
  const records: unknown = JSON.parse((await readFile(inputPath, "utf8")).replace(/^\uFEFF/, ""));
  if (!Array.isArray(records)) throw new Error("Expected an array of skill metadata");
  for (const record of records) {
    if (
      !record ||
      typeof record !== "object" ||
      typeof record.skillId !== "string" ||
      !record.skillId.trim() ||
      typeof record.name !== "string" ||
      !record.name.trim()
    )
      throw new Error("Each record needs a skillId and name");
    for (const field of ["description", "githubUrl", "license", "maintainer", "declaredCategory"]) {
      if (record[field] != null && typeof record[field] !== "string") throw new Error(`Invalid ${field}`);
    }
    if (record.githubUrl && !parseGithubRepo(record.githubUrl))
      throw new Error("Invalid GitHub repository URL");
    if (
      record.githubStars != null &&
      (!Number.isInteger(record.githubStars) || record.githubStars < 0 || record.githubStars > 2_147_483_647)
    )
      throw new Error("Invalid GitHub stars");
    if (
      record.githubStarsFetchedAt != null &&
      (typeof record.githubStarsFetchedAt !== "string" ||
        !Number.isFinite(Date.parse(record.githubStarsFetchedAt)))
    )
      throw new Error("Invalid GitHub stars timestamp");
  }
  const pool = new Pool({ connectionString: loadConfig().appDatabaseUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let imported = 0;
    for (const record of records) {
      const result = await client.query(
        `INSERT INTO skill_metadata (skill_id, name, description, github_url, license, maintainer,
          declared_category, github_stars, github_stars_fetched_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (skill_id) DO NOTHING`,
        [
          record.skillId,
          record.name,
          record.description ?? null,
          record.githubUrl ?? null,
          record.license ?? null,
          record.maintainer ?? null,
          record.declaredCategory ?? null,
          record.githubStars ?? null,
          record.githubStarsFetchedAt ?? null,
        ],
      );
      imported += result.rowCount ?? 0;
    }
    await client.query("COMMIT");
    console.log(
      `Imported ${imported} skills; preserved ${records.length - imported} existing catalog entries.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
