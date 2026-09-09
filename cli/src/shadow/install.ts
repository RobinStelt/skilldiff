import type { Agent } from "@skilldiff/schema";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Exact commands registered/removed — used both to write them and to
 * recognize (and only ever touch) entries this tool itself added, so
 * install/uninstall never disturbs a project's own, unrelated hooks.
 */
export const USER_PROMPT_SUBMIT_COMMAND = "skill-ab shadow user-prompt-submit";
export const STOP_COMMAND = "skill-ab shadow stop";

interface HookEntry {
  type: string;
  command: string;
}

interface MatcherGroup {
  matcher?: string;
  hooks: HookEntry[];
}

interface ClaudeSettings {
  hooks?: Record<string, MatcherGroup[]>;
  [key: string]: unknown;
}

function settingsPath(projectDir: string, agent: Agent = "claude"): string {
  return agent === "codex" ? join(projectDir, ".codex", "hooks.json") : join(projectDir, ".claude", "settings.json");
}

function readSettings(path: string): ClaudeSettings {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ClaudeSettings;
  } catch {
    throw new Error(`${path} exists but isn't valid JSON — fix or remove it before running "shadow install"`);
  }
}

function writeSettings(path: string, settings: ClaudeSettings): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

function addHook(settings: ClaudeSettings, event: string, command: string): void {
  settings.hooks ??= {};
  settings.hooks[event] ??= [];
  const alreadyPresent = settings.hooks[event].some((group) => group.hooks.some((h) => h.command === command));
  if (!alreadyPresent) {
    settings.hooks[event].push({ matcher: "*", hooks: [{ type: "command", command }] });
  }
}

function removeHook(settings: ClaudeSettings, event: string, command: string): void {
  if (!settings.hooks?.[event]) return;
  settings.hooks[event] = settings.hooks[event]
    .map((group) => ({ ...group, hooks: group.hooks.filter((h) => h.command !== command) }))
    .filter((group) => group.hooks.length > 0);
  if (settings.hooks[event].length === 0) delete settings.hooks[event];
  if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;
}

/**
 * Opt-in, per project only — never touches global/user-level settings.
 * Merges into an existing `.claude/settings.json` (preserving unrelated
 * settings and other hooks) rather than overwriting it. Idempotent: safe
 * to call again, never adds a duplicate entry.
 *
 * Requires `skill-ab` on PATH (a global install/link) — the hook commands
 * are plain strings Claude Code invokes directly, not resolved relative to
 * this package.
 */
export function installShadowHooks(projectDir: string, agent: Agent = "claude"): void {
  const path = settingsPath(projectDir, agent);
  const settings = readSettings(path);
  addHook(settings, "UserPromptSubmit", USER_PROMPT_SUBMIT_COMMAND + (agent === "codex" ? " --agent codex" : ""));
  addHook(settings, "Stop", STOP_COMMAND + (agent === "codex" ? " --agent codex" : ""));
  writeSettings(path, settings);
}

/** Removes exactly the two entries `installShadowHooks` adds — everything else in settings.json is left untouched. */
export function uninstallShadowHooks(projectDir: string, agent: Agent = "claude"): void {
  const path = settingsPath(projectDir, agent);
  if (!existsSync(path)) return;
  const settings = readSettings(path);
  removeHook(settings, "UserPromptSubmit", USER_PROMPT_SUBMIT_COMMAND + (agent === "codex" ? " --agent codex" : ""));
  removeHook(settings, "Stop", STOP_COMMAND + (agent === "codex" ? " --agent codex" : ""));
  writeSettings(path, settings);
}
