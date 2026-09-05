import { describe, expect, it } from "vitest";
import { runCondition, parseClaudeUsage } from "../src/orchestration/runCondition.js";
import type { ProcessRunner } from "../src/orchestration/processRunner.js";

describe("parseClaudeUsage", () => {
  it("sums all token categories from the claude --output-format json object", () => {
    const stdout = JSON.stringify({
      duration_ms: 4200,
      usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 10, cache_read_input_tokens: 5 },
    });
    expect(parseClaudeUsage(stdout)).toEqual({ tokens: 165, durationMs: 4200 });
  });

  it("falls back to 0 on unparseable output instead of throwing", () => {
    expect(parseClaudeUsage("not json")).toEqual({ tokens: 0, durationMs: 0 });
  });
});

function fakeRunner(responses: Record<string, { stdout: string; exitCode: number }>): ProcessRunner {
  return {
    async run(cmd) {
      const response = responses[cmd];
      if (!response) throw new Error(`No fake result configured for command "${cmd}"`);
      return { stdout: response.stdout, stderr: "", exitCode: response.exitCode };
    },
  };
}

describe("runCondition", () => {
  it("success=null when no check command is given", async () => {
    const runner = fakeRunner({
      claude: { stdout: JSON.stringify({ duration_ms: 1000, usage: { input_tokens: 10, output_tokens: 10 } }), exitCode: 0 },
    });
    const outcome = await runCondition({
      runner,
      claudeBin: "claude",
      claudeArgs: [],
      workDir: ".",
      env: {},
      checkCommand: null,
    });
    expect(outcome.success).toBeNull();
    expect(outcome.tokens).toBe(20);
    expect(outcome.duration_sec).toBe(1);
  });

  it("success=true/false comes exclusively from the check command's exit code, never from claude itself", async () => {
    const runner = fakeRunner({
      claude: { stdout: JSON.stringify({ duration_ms: 500, usage: {} }), exitCode: 0 },
      "npm test": { stdout: "", exitCode: 1 },
    });
    const outcome = await runCondition({
      runner,
      claudeBin: "claude",
      claudeArgs: [],
      workDir: ".",
      env: {},
      checkCommand: { cmd: "npm test", args: [] },
    });
    expect(outcome.success).toBe(false);
  });
});
