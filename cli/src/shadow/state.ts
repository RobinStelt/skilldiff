import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { defaultConfigDir } from "../config/localConfig.js";
import type { Condition } from "../isolation/types.js";

export interface ShadowState {
  sessionId: string;
  task: string;
  /** The real project directory the user is actually working in. */
  cwd: string;
  /** Fresh copy of `cwd` taken at UserPromptSubmit time, before the real turn ran — the common starting point both the real turn and the background counterfactual are compared against. */
  beforeSnapshotDir: string;
  skillId: string;
  skillSourceDir: string;
  /** Whether the skill was actually linked in `cwd` when the prompt was submitted — determines which condition the real, foreground turn represents. The background run always does the OPPOSITE condition. */
  foregroundCondition: Condition;
  /** `Date.now()` at UserPromptSubmit — Stop-time minus this is the real turn's wall-clock duration (README "Lowering per-run effort"). */
  promptSubmittedAtMs: number;
  checkCommand: { cmd: string; args: string[] } | null;
  endpointUrl: string | null;
  claudeBin: string;
  /** Filled in by handleStop once the real turn's usage is known — absent while only "armed" (see hooks.ts). */
  foregroundTokens?: number;
  foregroundDurationSec?: number;
}

function shadowStateDir(configDir: string = defaultConfigDir()): string {
  return join(configDir, "shadow");
}

function shadowStatePath(sessionId: string, configDir: string = defaultConfigDir()): string {
  return join(shadowStateDir(configDir), `${sessionId}.json`);
}

export function saveShadowState(state: ShadowState, configDir: string = defaultConfigDir()): void {
  mkdirSync(shadowStateDir(configDir), { recursive: true });
  writeFileSync(shadowStatePath(state.sessionId, configDir), JSON.stringify(state, null, 2), "utf-8");
}

/** `null` when nothing was ever saved for this session (e.g. no watched skills, or the skill's presence in `cwd` couldn't be determined — shadow mode silently opts out rather than guessing). */
export function loadShadowState(sessionId: string, configDir: string = defaultConfigDir()): ShadowState | null {
  const path = shadowStatePath(sessionId, configDir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ShadowState;
  } catch {
    return null;
  }
}

export function deleteShadowState(sessionId: string, configDir: string = defaultConfigDir()): void {
  rmSync(shadowStatePath(sessionId, configDir), { force: true });
}
