import type { WatchedSkill } from "./localConfig.js";

export interface LocalSkill {
  skillId: string;
  skillSourceDir: string;
  hash: string;
}

export interface WatchSyncDecision {
  /** Locally installed, catalogued, not yet watched. */
  toAdd: LocalSkill[];
  /** Already watched, still installed and catalogued, but its content hash moved on since the last sync. */
  toUpdateHash: Array<{ skillId: string; skillSourceDir: string; previousHash: string | null; newHash: string }>;
  /** Watched, but no longer found installed locally. */
  toRemove: string[];
}

/**
 * Pure reconciliation for `skill-ab watch sync` (kept separate from
 * `commands/watch.ts`'s filesystem/network I/O for the same reason
 * `shadow/hooks.ts` separates its decisions from I/O — this is the part
 * worth unit-testing without a real disk or backend).
 *
 * A skill is only ever auto-watched when it's BOTH installed locally AND
 * already known to the catalog — a locally installed skill your backend
 * has never catalogued is left alone, never silently auto-registered.
 */
export function decideWatchSync(
  local: LocalSkill[],
  catalogSkillIds: ReadonlySet<string>,
  currentlyWatched: readonly WatchedSkill[],
): WatchSyncDecision {
  const watchedById = new Map(currentlyWatched.map((s) => [s.skillId, s]));
  const localById = new Map(local.map((l) => [l.skillId, l]));

  const toAdd: LocalSkill[] = [];
  const toUpdateHash: WatchSyncDecision["toUpdateHash"] = [];

  for (const entry of local) {
    if (!catalogSkillIds.has(entry.skillId)) continue;
    const existing = watchedById.get(entry.skillId);
    if (!existing) {
      toAdd.push(entry);
    } else if (existing.lastKnownHash !== null && existing.lastKnownHash !== entry.hash) {
      toUpdateHash.push({
        skillId: entry.skillId,
        skillSourceDir: entry.skillSourceDir,
        previousHash: existing.lastKnownHash,
        newHash: entry.hash,
      });
    }
  }

  // A watched skill that's no longer installed locally is dropped — "watch
  // all" is meant to track reality, not accumulate stale entries the user
  // uninstalled long ago.
  const toRemove = currentlyWatched.filter((s) => !localById.has(s.skillId)).map((s) => s.skillId);

  return { toAdd, toUpdateHash, toRemove };
}
