import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { agentSchema, type Agent, type Execution } from "@skilldiff/schema";
import { resolveClaudeBin } from "../isolation/claudeBinary.js";

export function resolveAgentBin(agent: Agent, override?: string): string {
  if (agent === "claude") return resolveClaudeBin(override);
  if (override) {
    if (process.platform === "win32" && !/\.exe$/i.test(override)) throw new Error("--codex-bin must point to the native codex.exe on Windows.");
    return override;
  }
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    const binary = join(directory, process.platform === "win32" ? "codex.exe" : "codex");
    if (existsSync(binary)) return binary;
  }
  // npm installs the native executable inside its platform package on Windows.
  if (process.platform === "win32" && process.env.APPDATA) {
    const scope = join(process.env.APPDATA, "npm", "node_modules", "@openai");
    if (existsSync(scope)) {
      for (const name of readdirSync(scope).filter((name) => name.startsWith("codex"))) {
        for (const target of ["x86_64-pc-windows-msvc", "aarch64-pc-windows-msvc"]) {
          const binary = join(scope, name, "vendor", target, "codex", "codex.exe");
          if (existsSync(binary)) return binary;
        }
      }
    }
    throw new Error("Cannot find codex.exe. Install Codex or set --codex-bin to its native executable.");
  }
  return "codex";
}

export function parseAgent(value: unknown): Agent {
  return agentSchema.parse(value ?? "claude");
}

/** On Windows Codex resolves the OS home independently of HOME/USERPROFILE. */
export function personalCodexSkillOverrides(root = join(homedir(), ".agents", "skills")): string[] {
  const paths: string[] = [];
  const visited = new Set<string>();
  function visit(directory: string): void {
    if (!existsSync(directory)) return;
    const canonical = realpathSync(directory);
    if (visited.has(canonical)) return;
    visited.add(canonical);
    const skill = join(directory, "SKILL.md");
    if (existsSync(skill)) { paths.push(skill); return; }
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) visit(path);
    }
  }
  visit(root);
  return paths.length ? ["-c", `skills.config=[${paths.map((path) => `{path=${JSON.stringify(path)},enabled=false}`).join(",")}]`] : [];
}

export function buildAgentArgs(execution: Execution, task: string): string[] {
  if (execution.agent === "claude") {
    const args = ["-p", task, "--output-format", "json", "--setting-sources", "project", "--permission-mode", "acceptEdits"];
    if (execution.model !== "unknown") args.push("--model", execution.model);
    if (execution.reasoning_effort) args.push("--effort", execution.reasoning_effort);
    return args;
  }
  if (execution.model === "unknown") throw new Error("Codex comparisons require --model or a configured codex-model.");
  const args = ["exec", "--json", "--ignore-user-config", "--skip-git-repo-check", "--sandbox", "workspace-write", "--model", execution.model,
    "-c", 'approval_policy="never"', "-c", "features.hooks=false"];
  if (process.platform === "win32") args.push("-c", 'windows.sandbox="unelevated"');
  args.push(...personalCodexSkillOverrides());
  if (execution.reasoning_effort) args.push("-c", `model_reasoning_effort=${JSON.stringify(execution.reasoning_effort)}`);
  args.push("--", task);
  return args;
}

/** Cached and reasoning tokens are subsets of input/output, not additional tokens. */
export function codexUsageTokens(usage: unknown): number | null {
  if (!usage || typeof usage !== "object") return null;
  const u = usage as Record<string, unknown>;
  if (![u.input_tokens, u.output_tokens].every((v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0)) return null;
  return (u.input_tokens as number) + (u.output_tokens as number);
}

export function parseCodexUsage(stdout: string): { tokens: number; durationMs: number } {
  let tokens = 0;
  let completed = false;
  for (const line of stdout.split(/\r?\n/).filter((line) => line.trim())) {
    const event = JSON.parse(line);
    if (event.type === "turn.failed" || event.type === "error") throw new Error("Codex did not complete the comparison task.");
    if (event.type === "turn.completed") {
      const count = codexUsageTokens(event.usage);
      if (count === null) throw new Error("Codex completed without valid token usage; no result will be uploaded.");
      tokens += count;
      completed = true;
    }
  }
  if (!completed) throw new Error("Codex output has no completed turn; no result will be uploaded.");
  return { tokens, durationMs: 0 };
}
