import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleUserPromptSubmit, handleStop } from "../../src/shadow/hooks.js";
import { loadShadowState } from "../../src/shadow/state.js";
import type { LocalConfig } from "../../src/config/localConfig.js";

function baseConfig(overrides: Partial<LocalConfig> = {}): LocalConfig {
  return {
    accountId: "acct_1",
    signingSecret: "secret",
    consentSeenAt: "2026-01-01T00:00:00Z",
    standardConsentGiven: true,
    contentOptIn: false,
    watchedSkills: [],
    ...overrides,
  };
}

// Points HOME/USERPROFILE-derived config dir usage at a temp dir for the
// duration of these tests, since state.ts defaults to defaultConfigDir().
// Simpler: state.ts accepts a configDir override, but hooks.ts calls
// saveShadowState/loadShadowState/deleteShadowState WITHOUT passing one on
// purpose (mirrors how the hook CLI commands will call it for real). To
// keep this test isolated from the developer's real ~/.skill-ab, we
// override HOME/USERPROFILE for the test process.
let realHome: string | undefined;
let realUserProfile: string | undefined;
let tempHome: string;

beforeEach(() => {
  tempHome = mkdtempSync(join(tmpdir(), "skill-ab-hooks-home-"));
  realHome = process.env.HOME;
  realUserProfile = process.env.USERPROFILE;
  process.env.HOME = tempHome;
  process.env.USERPROFILE = tempHome;
});

afterEach(() => {
  process.env.HOME = realHome;
  process.env.USERPROFILE = realUserProfile;
  rmSync(tempHome, { recursive: true, force: true });
});

describe("handleUserPromptSubmit", () => {
  it("skips when no skills are watched", () => {
    const outcome = handleUserPromptSubmit(
      { session_id: "s1", prompt: "do the thing", cwd: "C:\\project" },
      {
        config: baseConfig(),
        snapshot: () => "C:\\snapshot",
        isSkillLinked: () => true,
        detectCheckCommand: () => null,
        endpointUrl: null,
        claudeBin: "claude",
      },
    );
    expect(outcome).toEqual({ status: "skipped", reason: "no_watched_skills" });
    expect(loadShadowState("s1")).toBeNull();
  });

  it("arms shadow mode with the one watched skill and records whether it's actually linked", () => {
    const config = baseConfig({ watchedSkills: [{ skillId: "ponytail", skillSourceDir: "C:\\skills\\ponytail" }] });
    const outcome = handleUserPromptSubmit(
      { session_id: "s2", prompt: "simplify this", cwd: "C:\\project" },
      {
        config,
        snapshot: (cwd) => `${cwd}-snapshot`,
        isSkillLinked: () => true,
        detectCheckCommand: () => ({ cmd: "npm", args: ["test"] }),
        endpointUrl: "http://localhost:3000/v1/run-results",
        claudeBin: "claude",
        now: () => 1000,
      },
    );
    expect(outcome).toEqual({ status: "armed", skillId: "ponytail", foregroundCondition: "with_skill" });

    const state = loadShadowState("s2");
    expect(state).toMatchObject({
      sessionId: "s2",
      task: "simplify this",
      skillId: "ponytail",
      foregroundCondition: "with_skill",
      beforeSnapshotDir: "C:\\project-snapshot",
      promptSubmittedAtMs: 1000,
    });
  });

  it("records without_skill as the foreground condition when the watched skill isn't actually linked", () => {
    const config = baseConfig({ watchedSkills: [{ skillId: "ponytail", skillSourceDir: "C:\\skills\\ponytail" }] });
    handleUserPromptSubmit(
      { session_id: "s3", prompt: "task", cwd: "C:\\project" },
      {
        config,
        snapshot: (cwd) => `${cwd}-snapshot`,
        isSkillLinked: () => false,
        detectCheckCommand: () => null,
        endpointUrl: null,
        claudeBin: "claude",
      },
    );
    expect(loadShadowState("s3")?.foregroundCondition).toBe("without_skill");
  });

  it("never selects more than one skill even when several are watched", () => {
    const config = baseConfig({
      watchedSkills: [
        { skillId: "a", skillSourceDir: "a-dir" },
        { skillId: "b", skillSourceDir: "b-dir" },
      ],
    });
    const outcome = handleUserPromptSubmit(
      { session_id: "s4", prompt: "task", cwd: "C:\\project" },
      {
        config,
        rng: () => 0.99,
        snapshot: (cwd) => `${cwd}-snapshot`,
        isSkillLinked: () => true,
        detectCheckCommand: () => null,
        endpointUrl: null,
        claudeBin: "claude",
      },
    );
    expect(outcome.status).toBe("armed");
    if (outcome.status === "armed") {
      expect(["a", "b"]).toContain(outcome.skillId);
    }
  });
});

describe("handleStop", () => {
  it("skips when there is no armed state for this session (no watched skills, or a plain non-shadow session)", () => {
    const outcome = handleStop(
      { session_id: "does-not-exist", transcript_path: "C:\\nope.jsonl" },
      { extractUsage: () => 42, spawnWorker: () => {} },
    );
    expect(outcome).toEqual({ status: "skipped", reason: "no_state" });
  });

  it("skips a re-entrant Stop (stop_hook_active) without touching state", () => {
    handleUserPromptSubmit(
      { session_id: "s5", prompt: "task", cwd: "C:\\project" },
      {
        config: baseConfig({ watchedSkills: [{ skillId: "a", skillSourceDir: "a-dir" }] }),
        snapshot: (cwd) => `${cwd}-snapshot`,
        isSkillLinked: () => true,
        detectCheckCommand: () => null,
        endpointUrl: null,
        claudeBin: "claude",
      },
    );
    let spawned = false;
    const outcome = handleStop(
      { session_id: "s5", transcript_path: "C:\\t.jsonl", stop_hook_active: true },
      { extractUsage: () => 10, spawnWorker: () => (spawned = true) },
    );
    expect(outcome).toEqual({ status: "skipped", reason: "reentrant_stop" });
    expect(spawned).toBe(false);
    expect(loadShadowState("s5")).not.toBeNull(); // state untouched, could still resolve later
  });

  it("discards the armed state and skips when usage can't be measured, instead of faking zero", () => {
    handleUserPromptSubmit(
      { session_id: "s6", prompt: "task", cwd: "C:\\project" },
      {
        config: baseConfig({ watchedSkills: [{ skillId: "a", skillSourceDir: "a-dir" }] }),
        snapshot: (cwd) => `${cwd}-snapshot`,
        isSkillLinked: () => true,
        detectCheckCommand: () => null,
        endpointUrl: null,
        claudeBin: "claude",
      },
    );
    const outcome = handleStop(
      { session_id: "s6", transcript_path: "C:\\t.jsonl" },
      { extractUsage: () => null, spawnWorker: () => {} },
    );
    expect(outcome).toEqual({ status: "skipped", reason: "usage_unavailable" });
    expect(loadShadowState("s6")).toBeNull();
  });

  it("enriches the state with tokens/duration and spawns the worker for a normal Stop", () => {
    handleUserPromptSubmit(
      { session_id: "s7", prompt: "task", cwd: "C:\\project" },
      {
        config: baseConfig({ watchedSkills: [{ skillId: "a", skillSourceDir: "a-dir" }] }),
        snapshot: (cwd) => `${cwd}-snapshot`,
        isSkillLinked: () => true,
        detectCheckCommand: () => null,
        endpointUrl: null,
        claudeBin: "claude",
        now: () => 1_000,
      },
    );
    let spawnedSessionId: string | null = null;
    const outcome = handleStop(
      { session_id: "s7", transcript_path: "C:\\t.jsonl" },
      { extractUsage: () => 500, spawnWorker: (id) => (spawnedSessionId = id), now: () => 6_000 },
    );
    expect(outcome).toEqual({ status: "spawned" });
    expect(spawnedSessionId).toBe("s7");
    const state = loadShadowState("s7");
    expect(state?.foregroundTokens).toBe(500);
    expect(state?.foregroundDurationSec).toBe(5);
  });
});
