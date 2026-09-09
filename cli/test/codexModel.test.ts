import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readCurrentCodexModel, verifyCodexModel } from "../src/agents/codexModel.js";
import { showLocalDelta } from "../src/report/localReport.js";
import type { Execution } from "@skilldiff/schema";

const execution: Execution = { agent: "codex", model: "test-model", reasoning_effort: "low", agent_version: "test" };
const stdout = JSON.stringify({ type: "thread.started", thread_id: "session-1" });
const directories: string[] = [];
function fixture(contexts: unknown[]) {
  const home = mkdtempSync(join(tmpdir(), "skilldiff-model-test-")); directories.push(home);
  mkdirSync(join(home, "sessions", "date"), { recursive: true });
  const path = join(home, "sessions", "date", "rollout-session-1.jsonl");
  writeFileSync(path, contexts.map((payload) => JSON.stringify({ type: "turn_context", payload })).join("\n"));
  return { home, path };
}
afterEach(() => { vi.restoreAllMocks(); for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });

it("verifies the session reported by the process and captures effort", () => {
  const { home } = fixture([{ model: "test-model", effort: "low" }]);
  expect(verifyCodexModel(home, stdout, { ...execution, reasoning_effort: null })).toEqual(execution);
});

it.each([
  [],
  [{ model: "other-model", effort: "low" }],
  [{ model: "test-model", effort: "high" }],
  [{ model: "test-model", effort: "low" }, { model: "other-model", effort: "low" }],
].map((contexts) => ({ contexts })))("rejects missing or changed execution metadata: $contexts", ({ contexts }) => {
  const { home } = fixture(contexts);
  expect(() => verifyCodexModel(home, stdout, execution)).toThrow();
});

it("does not substitute another session when the reported rollout is missing", () => {
  const { home } = fixture([{ model: "test-model", effort: "low" }]);
  expect(() => verifyCodexModel(home, stdout.replace("session-1", "session-2"), execution)).toThrow(/Cannot verify/);
});

it("inherits the latest model of the identified parent session, tolerating an unfinished line", () => {
  const { home, path } = fixture([{ model: "old-model", effort: "high" }, { model: "test-model", effort: "low" }]);
  writeFileSync(path, '\n{"unfinished":', { flag: "a" });
  expect(readCurrentCodexModel({ CODEX_HOME: home, CODEX_THREAD_ID: "session-1" })).toEqual({ model: "test-model", effort: "low" });
  expect(readCurrentCodexModel({ CODEX_HOME: home, CODEX_THREAD_ID: "session-2" })).toBeNull();
  expect(readCurrentCodexModel({ CODEX_HOME: home })).toBeNull();
});

it("always includes agent, model and reasoning in the local report", () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const outcome = { success: true, tokens: 12, duration_sec: 1 };
  showLocalDelta({ skillId: "test", execution, withSkill: outcome, withoutSkill: outcome });
  const text = log.mock.calls.flat().join("\n");
  expect(text).toContain("codex"); expect(text).toContain("test-model"); expect(text).toContain("low");
});
