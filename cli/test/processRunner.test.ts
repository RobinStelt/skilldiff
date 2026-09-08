import { describe, expect, it } from "vitest";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { realProcessRunner } from "../src/orchestration/processRunner.js";

/**
 * Real, end-to-end regression tests for two bugs found sequentially in
 * the same spot while running actual comparisons (see the long comment
 * on processRunner.ts for the full story) — both fixed by making
 * `useShell` an explicit per-call opt-in instead of one blanket
 * platform-wide default:
 *
 * 1. The `claude` call (no `useShell`) must NOT go through a shell —
 *    `spawn(cmd, args, { shell: true })` on Windows does not quote
 *    `args`, so a multi-word task argument got split into several
 *    tokens by cmd.exe's own line parsing. Diagnosed from the raw
 *    `claude --output-format json` output: `result` was literally "I
 *    don't have any context for what needs fixing... no file, error, or
 *    diff mentioned yet" despite a normal `--task` string in code.
 * 2. The check-command call (`useShell: true`) must still resolve a bare
 *    PATH-dependent command name like "npm" (an npm-installed `.cmd`
 *    shim on Windows, unreachable with `shell: false` — ENOENT). Tried
 *    fixing bug 1 by quoting every argument (including `cmd`) instead of
 *    scoping shell away from the `claude` call — that broke THIS
 *    resolution a different way: a quoted `"npm"` resolved to a bogus
 *    `<cwd>/node_modules/npm/bin/npm-prefix.js` lookup instead of the
 *    real global npm, on this Node version. Unquoted, plain `shell:
 *    true` — opt-in, per call — has neither problem.
 */
describe("realProcessRunner", () => {
  it("passes a multi-word, shell-special-character argument through unshelled (the claude-call shape)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "skill-ab-processrunner-test-"));
    const scriptPath = join(dir, "echo-argv.js");
    writeFileSync(scriptPath, "console.log(JSON.stringify(process.argv.slice(2)));");
    try {
      // The parens/period/slash here are deliberate — this is the exact
      // shape of a real task description, not just a string with spaces.
      const taskLikeArg = "Fix the failing test (in tests/subscribe.spec.js) so it passes.";
      const result = await realProcessRunner.run(
        process.execPath, // node itself — always a real, resolvable path, exactly like claudeBin. On this machine it's "C:\Program Files\nodejs\node.exe", a real example of a command path containing a space.
        [scriptPath, taskLikeArg, "--flag", "value"],
        { cwd: dir, env: process.env },
      );
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual([taskLikeArg, "--flag", "value"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resolves a bare PATH-dependent command with useShell (the check-command shape)", async () => {
    // "npm" specifically — the real command this bug was found on. If
    // shell resolution or the (now-removed) quoting regresses, this
    // fails exactly the way the real bug did: either ENOENT (no shell)
    // or a bogus node_modules/npm lookup relative to `cwd` (bad quoting).
    const result = await realProcessRunner.run("npm", ["--version"], {
      cwd: tmpdir(),
      env: process.env,
      useShell: true,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
