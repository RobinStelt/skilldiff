import pc from "picocolors";
import { loadOrCreateConfig, addWatchedSkill, removeWatchedSkill } from "../config/localConfig.js";

/**
 * Registers/removes/lists the skills `run` picks from when `--skill` and
 * `--skill-source` are omitted (README "Watching skills"). Path validation
 * (must live outside any --dir) happens in `run` itself at the point a
 * watched entry is actually used — the same rule applies whether the
 * source came from --skill-source or from the watch list, so there's no
 * separate check duplicated here.
 */
export function watchAddCommand(options: { skillId: string; skillSourceDir: string }): void {
  const config = loadOrCreateConfig();
  addWatchedSkill(config, { skillId: options.skillId, skillSourceDir: options.skillSourceDir });
  console.log(pc.green(`✓ Watching "${options.skillId}" (${options.skillSourceDir})`));
}

export function watchRemoveCommand(options: { skillId: string }): void {
  const config = loadOrCreateConfig();
  removeWatchedSkill(config, options.skillId);
  console.log(pc.green(`✓ No longer watching "${options.skillId}"`));
}

export function watchListCommand(): void {
  const config = loadOrCreateConfig();
  if (config.watchedSkills.length === 0) {
    console.log(pc.dim("No watched skills. Add one with: skill-ab watch add --skill <id> --source <path>"));
    return;
  }
  for (const skill of config.watchedSkills) {
    console.log(`${skill.skillId}\t${skill.skillSourceDir}`);
  }
}
