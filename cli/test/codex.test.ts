import { realProcessRunner } from "../src/orchestration/processRunner.js";
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildAgentArgs, parseCodexUsage, personalCodexSkillOverrides } from "../src/agents/adapter.js";
import { runComparison, cleanupWorkDirCopies } from "../src/orchestration/runOrchestrator.js";
import { runCondition } from "../src/orchestration/runCondition.js";
import { installShadowHooks, uninstallShadowHooks } from "../src/shadow/install.js";
import { isolatedAgentEnv } from "../src/isolation/gating.js";
import { readCodexSnapshot } from "../src/shadow/codexTranscript.js";
import type { Execution } from "@skilldiff/schema";

const execution: Execution = { agent: "codex", model: "test-model", agent_version: "test", reasoning_effort: "medium" };
const output = JSON.stringify({ type: "turn.completed", usage: { input_tokens: 100, cached_input_tokens: 80, output_tokens: 20, reasoning_output_tokens: 10 } });
const temp: string[] = [];
function directory() { const path = mkdtempSync(join(tmpdir(), "skilldiff-codex-test-")); temp.push(path); return path; }
afterEach(() => { for (const path of temp.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe("Codex adapter", () => {
  it("pins model and effort and treats the task as an argument", () => {
    const task = 'Fix this & write "hello"';
    const args = buildAgentArgs(execution, task);
    expect(args).toContain("test-model");
    expect(args).toContain('model_reasoning_effort="medium"');
    expect(args.slice(-2)).toEqual(["--", task]);
    expect(() => buildAgentArgs({ ...execution, model: "unknown" }, task)).toThrow(/require/);
  });
  it("counts cache/reasoning subsets once", () => {
    expect(parseCodexUsage(output).tokens).toBe(120);
  });
  it.each(["", "not json", '{"type":"turn.failed"}', '{"type":"turn.completed"}', '{"type":"turn.completed","usage":{"input_tokens":-1,"output_tokens":2}}'])("rejects incomplete or invalid usage: %s", (value) => {
    expect(() => parseCodexUsage(value)).toThrow();
  });
  it("does not run a success check after an agent process failure", async () => {
    let calls = 0;
    await expect(runCondition({ agent: "codex", claudeBin: "codex", claudeArgs: [], workDir: ".", env: {}, checkCommand: { cmd: "check", args: [] },
      runner: { async run() { calls++; return { exitCode: 1, stdout: output, stderr: "failed" }; } },
    })).rejects.toThrow(/process failed/);
    expect(calls).toBe(1);
  });
  it("runs independent copies with the skill only in the treatment condition", async () => {
    const project = directory(); const source = directory();
    writeFileSync(join(source, "SKILL.md"), "---\nname: demo\ndescription: Test\n---\nTest instructions");
    writeFileSync(join(project, "original.txt"), "before");
    const homes: string[] = [];
    const presence: boolean[] = [];
    const result = await runComparison({ agent: "codex", originalWorkDir: project, skillId: "demo", skillSourceDir: source,
      tier: "C", linkCapability: { symlink: false, junction: false }, checkCommand: null, rng: () => 0,
      buildInvocation: () => ({ bin: "codex", args: buildAgentArgs(execution, "Do the task") }),
      runner: { async run(_cmd, _args, options) {
        expect(readFileSync(join(options.cwd, "original.txt"), "utf8")).toBe("before");
        writeFileSync(join(options.cwd, "original.txt"), "after");
        homes.push(options.env.CODEX_HOME!);
        expect(options.env.SKILL_AB_INTERNAL_RUN).toBe("1");
        presence.push(existsSync(join(options.cwd, ".agents", "skills", "demo", "SKILL.md")));
        return { stdout: output, stderr: "", exitCode: 0 };
      } },
    });
    try {
      expect(presence.sort()).toEqual([false, true]);
      expect(new Set(homes).size).toBe(2);
      expect(homes.every((path) => !existsSync(path))).toBe(true);
      expect(result.withSkill.runOutcome.tokens).toBe(120);
      expect(readFileSync(join(project, "original.txt"), "utf8")).toBe("before");
    } finally { cleanupWorkDirCopies(result); }
  });
  it("installs and removes only Codex shadow hooks", () => {
    const project = directory(); mkdirSync(join(project, ".codex"));
    const path = join(project, ".codex", "hooks.json");
    writeFileSync(path, JSON.stringify({ description: "Existing hooks", hooks: { Stop: [{ hooks: [{ type: "command", command: "my-hook" }] }] } }));
    installShadowHooks(project, "codex"); installShadowHooks(project, "codex");
    expect(readFileSync(path, "utf8").match(/skill-ab shadow stop/g)).toHaveLength(1);
    expect(readFileSync(path, "utf8")).toContain("--agent codex");
    uninstallShadowHooks(project, "codex");
    expect(readFileSync(path, "utf8")).toContain("my-hook");
    expect(readFileSync(path, "utf8")).not.toContain("skill-ab");
  });
  it("reads cumulative Codex transcript usage and rejects unknown formats", () => {
    const path = join(directory(), "rollout.jsonl");
    writeFileSync(path, [JSON.stringify({ type: "turn_context", payload: { model: "test-model", effort: "medium", turn_id: "turn-1" } }), JSON.stringify({ type: "event_msg", payload: { type: "token_count", info: { total_token_usage: { input_tokens: 100, output_tokens: 20 } } } })].join("\n"));
    expect(readCodexSnapshot(path)).toEqual({ tokens: 120, model: "test-model", effort: "medium", turnId: "turn-1" });
    writeFileSync(path, "{}"); expect(readCodexSnapshot(path)).toBeNull();
  });
});


it("excludes personal skills and inherited app session settings", () => {
  const root = directory(); mkdirSync(join(root, "private-skill"));
  writeFileSync(join(root, "private-skill", "SKILL.md"), "private");
  expect(personalCodexSkillOverrides(root)[1]).toContain("enabled=false");
  expect(personalCodexSkillOverrides(root)[1]).toContain("private-skill");
  const previous = process.env.CODEX_THREAD_ID;
  process.env.CODEX_THREAD_ID = "parent-thread";
  try {
    const env = isolatedAgentEnv(root, "codex");
    expect(env.CODEX_THREAD_ID).toBeUndefined();
    expect(env.CODEX_HOME).toBe(join(root, ".codex"));
  } finally {
    if (previous === undefined) delete process.env.CODEX_THREAD_ID;
    else process.env.CODEX_THREAD_ID = previous;
  }
});


it("closes stdin and preserves literal task arguments without a shell", async () => {
  const task = 'a task with spaces & "quotes"';
  const result = await realProcessRunner.run(process.execPath, ["-e", "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write(process.argv[1]));", task], { cwd: directory(), env: process.env });
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toBe(task);
});
