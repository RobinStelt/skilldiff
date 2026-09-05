import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  installShadowHooks,
  uninstallShadowHooks,
  USER_PROMPT_SUBMIT_COMMAND,
  STOP_COMMAND,
} from "../../src/shadow/install.js";

describe("installShadowHooks / uninstallShadowHooks", () => {
  let dir: string;

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function readSettings(): Record<string, unknown> {
    return JSON.parse(readFileSync(join(dir, ".claude", "settings.json"), "utf-8"));
  }

  it("creates .claude/settings.json with both hooks when none existed", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-install-"));
    installShadowHooks(dir);
    const settings = readSettings() as { hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>> };
    expect(settings.hooks.UserPromptSubmit![0]!.hooks[0]!.command).toBe(USER_PROMPT_SUBMIT_COMMAND);
    expect(settings.hooks.Stop![0]!.hooks[0]!.command).toBe(STOP_COMMAND);
  });

  it("preserves unrelated settings and other hooks already present", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-install-"));
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(
      join(dir, ".claude", "settings.json"),
      JSON.stringify({
        permissions: { allow: ["Bash(npm test)"] },
        hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "my-other-hook.sh" }] }] },
      }),
    );

    installShadowHooks(dir);

    const settings = readSettings() as {
      permissions: { allow: string[] };
      hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
    };
    expect(settings.permissions.allow).toEqual(["Bash(npm test)"]);
    expect(settings.hooks.PreToolUse![0]!.hooks[0]!.command).toBe("my-other-hook.sh");
    expect(settings.hooks.UserPromptSubmit![0]!.hooks[0]!.command).toBe(USER_PROMPT_SUBMIT_COMMAND);
  });

  it("is idempotent — calling install twice does not duplicate entries", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-install-"));
    installShadowHooks(dir);
    installShadowHooks(dir);
    const settings = readSettings() as { hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>> };
    expect(settings.hooks.UserPromptSubmit).toHaveLength(1);
    expect(settings.hooks.Stop).toHaveLength(1);
  });

  it("uninstall removes exactly the two entries it added, nothing else", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-install-"));
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(
      join(dir, ".claude", "settings.json"),
      JSON.stringify({
        hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "my-other-hook.sh" }] }] },
      }),
    );
    installShadowHooks(dir);
    uninstallShadowHooks(dir);

    const settings = readSettings() as { hooks: Record<string, unknown> };
    expect(settings.hooks.UserPromptSubmit).toBeUndefined();
    expect(settings.hooks.Stop).toBeUndefined();
    expect(settings.hooks.PreToolUse).toBeDefined();
  });

  it("uninstall on a project that never installed is a no-op, not an error", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-install-"));
    expect(() => uninstallShadowHooks(dir)).not.toThrow();
  });
});
