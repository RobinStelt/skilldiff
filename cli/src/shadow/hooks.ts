import type { LocalConfig, WatchedSkill } from "../config/localConfig.js";
import { pickRandomWatchedSkill } from "../config/localConfig.js";
import type { Condition } from "../isolation/types.js";
import type { CheckCommand } from "../category/detectCheckCommand.js";
import { saveShadowState, loadShadowState, deleteShadowState, type ShadowState } from "./state.js";

export interface UserPromptSubmitInput {
  session_id: string;
  prompt: string;
  cwd: string;
}

export interface UserPromptSubmitDeps {
  config: LocalConfig;
  /** Injectable so tests don't depend on Math.random. */
  rng?: () => number;
  now?: () => number;
  /** Creates a fresh, independent copy of `cwd` and returns its path — mirrors runOrchestrator's freshWorkDirCopy. */
  snapshot: (cwd: string) => string;
  /** Is `skillId`'s source currently linked into `cwd` (i.e. would the real, foreground turn actually see it)? */
  isSkillLinked: (cwd: string, skillId: string) => boolean;
  detectCheckCommand: (cwd: string) => CheckCommand | null;
  endpointUrl: string | null;
  claudeBin: string;
}

export type UserPromptSubmitOutcome =
  | { status: "armed"; skillId: string; foregroundCondition: Condition }
  | { status: "skipped"; reason: "no_watched_skills" };

/**
 * Decides whether to "arm" shadow mode for this turn, and if so, which
 * watched skill to measure and what the just-submitted prompt's turn will
 * actually represent (with_skill or without_skill), based on whether that
 * skill is really linked into the project right now — never assumed.
 *
 * Never picks more than one skill (plan section 4/5, section 7.1) even if
 * several are watched — one random pick per turn.
 */
export function handleUserPromptSubmit(
  input: UserPromptSubmitInput,
  deps: UserPromptSubmitDeps,
): UserPromptSubmitOutcome {
  const rng = deps.rng ?? Math.random;
  const now = deps.now ?? Date.now;

  const watched: WatchedSkill | null = pickRandomWatchedSkill(deps.config, rng);
  if (!watched) {
    return { status: "skipped", reason: "no_watched_skills" };
  }

  const foregroundCondition: Condition = deps.isSkillLinked(input.cwd, watched.skillId)
    ? "with_skill"
    : "without_skill";

  const state: ShadowState = {
    sessionId: input.session_id,
    task: input.prompt,
    cwd: input.cwd,
    beforeSnapshotDir: deps.snapshot(input.cwd),
    skillId: watched.skillId,
    skillSourceDir: watched.skillSourceDir,
    foregroundCondition,
    promptSubmittedAtMs: now(),
    checkCommand: deps.detectCheckCommand(input.cwd),
    endpointUrl: deps.endpointUrl,
    claudeBin: deps.claudeBin,
  };
  saveShadowState(state);

  return { status: "armed", skillId: watched.skillId, foregroundCondition };
}

export interface StopInput {
  session_id: string;
  transcript_path: string;
  /**
   * Some Claude Code versions set this to avoid a hook-triggered Stop
   * re-triggering itself; not confirmed present in every version (found
   * via external docs, not verified against this repo's own claude
   * install) — checked defensively, harmless if the field is simply
   * absent.
   */
  stop_hook_active?: boolean;
}

export interface StopDeps {
  now?: () => number;
  /** Reads the real turn's token usage from the transcript — null means "couldn't measure", must NOT be treated as zero. */
  extractUsage: (transcriptPath: string) => number | null;
  /** Spawns the detached background worker for this now-enriched state file; must not block/wait. */
  spawnWorker: (sessionId: string) => void;
}

export type StopOutcome =
  | { status: "spawned" }
  | { status: "skipped"; reason: "no_state" | "reentrant_stop" | "usage_unavailable" };

/**
 * Fast path only — everything slow (running the counterfactual claude
 * call, the check command, uploading) happens in the detached worker
 * (src/shadow/worker.ts) so the user's real Stop event is never delayed by
 * this.
 */
export function handleStop(input: StopInput, deps: StopDeps): StopOutcome {
  if (input.stop_hook_active) {
    return { status: "skipped", reason: "reentrant_stop" };
  }

  const state = loadShadowState(input.session_id);
  if (!state) {
    return { status: "skipped", reason: "no_state" };
  }

  const now = deps.now ?? Date.now;
  const tokens = deps.extractUsage(input.transcript_path);
  if (tokens === null) {
    // A real turn happened but we can't honestly measure it — upload
    // nothing rather than a fabricated zero (see transcriptUsage.ts).
    deleteShadowState(input.session_id);
    return { status: "skipped", reason: "usage_unavailable" };
  }

  const enriched: ShadowState = {
    ...state,
    foregroundTokens: tokens,
    foregroundDurationSec: Math.round((now() - state.promptSubmittedAtMs) / 1000),
  };
  saveShadowState(enriched);
  deps.spawnWorker(input.session_id);

  return { status: "spawned" };
}
