import { parseAgent } from "../agents/adapter.js";
import type { Agent } from "@skilldiff/schema";
import { existsSync, readdirSync, statSync, cpSync, mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { defaultConfigDir, loadOrCreateConfig, addWatchedSkill, removeWatchedSkill, type WatchedSkill } from "../config/localConfig.js";
import { hashSkillSourceDir } from "../skill/contentHash.js";
import { decideWatchSync, type LocalSkill } from "../config/watchSyncDecision.js";

/**
 * Registers/removes/lists the skills `run` picks from when `--skill` and
 * `--skill-source` are omitted (README "Watching skills"). Path validation
 * (must live outside any --dir) happens in `run` itself at the point a
 * watched entry is actually used — the same rule applies whether the
 * source came from --skill-source or from the watch list, so there's no
 * separate check duplicated here.
 */
export function watchAddCommand(options: { skillId: string; skillSourceDir: string; agent?: Agent }): void {
  const config = loadOrCreateConfig();
  const lastKnownHash = hashSkillSourceDir(options.skillSourceDir);
  addWatchedSkill(config, { agent: parseAgent(options.agent ?? config.agent), skillId: options.skillId, skillSourceDir: options.skillSourceDir, lastKnownHash });
  console.log(pc.green(`✓ Watching "${options.skillId}" (${options.skillSourceDir})`));
}

export function watchRemoveCommand(options: { skillId: string; agent?: Agent }): void {
  const config = loadOrCreateConfig();
  removeWatchedSkill(config, options.skillId, undefined, parseAgent(options.agent ?? config.agent));
  console.log(pc.green(`✓ No longer watching "${options.skillId}"`));
}

export function watchListCommand(agent?: Agent): void {
  const config = loadOrCreateConfig();
  if (config.watchedSkills.length === 0) {
    console.log(pc.dim("No watched skills. Add one with: skill-ab watch add --skill <id> --source <path>"));
    return;
  }
  for (const skill of config.watchedSkills.filter((skill) => (skill.agent ?? "claude") === parseAgent(agent ?? config.agent))) {
    console.log(`${skill.skillId}\t${skill.skillSourceDir}`);
  }
}

/**
 * Every subdirectory of `<dir>/.claude/skills/` that looks like a real
 * skill (has a SKILL.md) — the same on-disk convention Claude Code itself
 * uses to discover skills for a real session, and the one
 * `isolation/gating.ts` (`isSkillLinked`) already reads from. This is
 * "what's really installed here", independent of what's registered with
 * `skill-ab watch add`.
 */
function scanLocallyInstalledSkills(dir: string, agent: Agent = "claude"): LocalSkill[] {
  const skillsDir = join(dir, agent === "codex" ? ".agents" : ".claude", "skills");
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter((name) => statSync(join(skillsDir, name)).isDirectory())
    .filter((name) => existsSync(join(skillsDir, name, "SKILL.md")))
    .map((skillId) => {
      const skillSourceDir = join(skillsDir, skillId);
      return { skillId, skillSourceDir, hash: hashSkillSourceDir(skillSourceDir) };
    });
}

interface CatalogPage {
  skills: Array<{ skillId: string }>;
  nextCursor: string | null;
}

/** Every skillId your marketplace backend currently knows about (paginates `GET /api/skills`). */
async function fetchCatalogSkillIds(
  endpointUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<ReadonlySet<string>> {
  const ids = new Set<string>();
  let cursor: string | null = null;
  do {
    const url = new URL("/api/skills", endpointUrl);
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetchFn(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch skill catalog: HTTP ${response.status} from ${url.toString()}`);
    }
    const page = (await response.json()) as CatalogPage;
    for (const skill of page.skills) ids.add(skill.skillId);
    cursor = page.nextCursor;
  } while (cursor);
  return ids;
}

/**
 * Reconciles "watch all available skills" (the actual feature request):
 * watches every skill that is BOTH installed locally (`.claude/skills/`)
 * AND already catalogued in your marketplace backend — never a locally
 * installed skill your backend has never heard of, and never a
 * catalogued skill you don't actually have. Also drops watched entries
 * for skills no longer installed locally, and warns (without silently
 * mixing data) when an already-watched skill's content changed since it
 * was last synced — see `watchSyncDecision.ts` for the pure decision
 * logic this wraps.
 */
export async function watchSyncCommand(options: { dir?: string; endpointUrl?: string; agent?: Agent }): Promise<void> {
  let config = loadOrCreateConfig();
  const agent = parseAgent(options.agent ?? config.agent);
  const endpointUrl = options.endpointUrl ?? config.endpointUrl;
  if (!endpointUrl) {
    throw new Error(
      'No endpoint to sync against — pass --endpoint or run "skill-ab config set endpoint <url>" once.',
    );
  }

  const local = scanLocallyInstalledSkills(options.dir ?? process.cwd(), parseAgent(options.agent ?? config.agent));
  const catalogSkillIds = await fetchCatalogSkillIds(endpointUrl);
  const decision = decideWatchSync(local, catalogSkillIds, config.watchedSkills.filter((skill) => (skill.agent ?? "claude") === agent));

  for (const entry of decision.toAdd) {
    config = addWatchedSkill(config, { agent, skillId: entry.skillId, skillSourceDir: cacheSkillSource(entry.skillSourceDir), lastKnownHash: entry.hash });
    console.log(pc.green(`✓ Watching "${entry.skillId}" (${entry.skillSourceDir})`));
  }
  for (const entry of decision.toUpdateHash) {
    const updated: WatchedSkill = { agent, skillId: entry.skillId, skillSourceDir: cacheSkillSource(entry.skillSourceDir), lastKnownHash: entry.newHash };
    config = addWatchedSkill(config, updated);
    console.log(
      pc.yellow(
        `⚠ "${entry.skillId}" changed since it was last watched — measurements from now on reflect the new content.`,
      ),
    );
  }
  for (const skillId of decision.toRemove) {
    config = removeWatchedSkill(config, skillId, undefined, agent);
    console.log(pc.dim(`– No longer installed locally, stopped watching "${skillId}"`));
  }
  if (decision.toAdd.length === 0 && decision.toUpdateHash.length === 0 && decision.toRemove.length === 0) {
    console.log(pc.dim("Nothing to sync — watch list already matches what's installed and catalogued."));
  }
}

function cacheSkillSource(source: string): string {
  const root = join(defaultConfigDir(), "skill-snapshots");
  mkdirSync(root, { recursive: true });
  const destination = mkdtempSync(join(root, "skill-"));
  cpSync(source, destination, { recursive: true, dereference: true });
  return destination;
}
