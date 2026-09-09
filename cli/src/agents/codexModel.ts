import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Execution } from "@skilldiff/schema";

function findRollouts(directory: string, thread: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry): string[] => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? findRollouts(path, thread) : entry.isFile() && entry.name.endsWith(`${thread}.jsonl`) ? [path] : [];
  });
}

/** An inherited thread ID identifies the calling Codex session; never guess by file recency. */
export function readCurrentCodexModel(env: NodeJS.ProcessEnv = process.env): { model: string; effort: string | null } | null {
  const thread = env.CODEX_THREAD_ID ?? env.CODEX_SESSION_ID;
  if (!thread || !/^[a-zA-Z0-9-]+$/.test(thread)) return null;
  try {
    const paths = findRollouts(join(env.CODEX_HOME ?? join(homedir(), ".codex"), "sessions"), thread);
    if (paths.length !== 1) return null;
    // The last line may still be in flight while the parent session is running.
    const contexts = readFileSync(paths[0]!, "utf8").split(/\r?\n/).flatMap((line) => {
      try { const event = JSON.parse(line); return event.type === "turn_context" ? [event.payload] : []; }
      catch { return []; }
    });
    const latest = contexts.at(-1);
    return typeof latest?.model === "string" && latest.model.trim() ? { model: latest.model, effort: typeof latest.effort === "string" ? latest.effort : null } : null;
  } catch { return null; }
}

/** Ask Codex to resolve its configuration, including project layers, without a model call. */
export function readCodexDefaults(binary: string, cwd: string): Promise<{ model: string; effort: string | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ["app-server"], { cwd, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let buffer = "";
    const timer = setTimeout(() => finish(new Error("Codex configuration discovery timed out. Set --model explicitly.")), 15_000);
    let done = false;
    function finish(error?: Error, value?: { model: string; effort: string | null }) {
      if (done) return;
      done = true; clearTimeout(timer); child.kill();
      if (error) reject(error); else resolve(value!);
    }
    child.on("error", (error) => finish(error));
    child.on("exit", () => finish(new Error("Codex configuration discovery ended without a model. Set --model explicitly.")));
    child.stdin.on("error", (error) => finish(error));
    child.stderr.resume();
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        try {
          const message = JSON.parse(line);
          if (message.id === 1) {
            if (message.error) { finish(new Error("Codex initialization failed.")); return; }
            child.stdin.write(JSON.stringify({ id: 2, method: "config/read", params: { includeLayers: false, cwd } }) + "\n");
          }
          if (message.id !== 2) continue;
          const config = message.result?.config;
          if (typeof config?.model !== "string" || !config.model.trim()) {
            finish(new Error("Codex has no explicit configured model. Set --model or configure a Codex model.")); return;
          }
          finish(undefined, { model: config.model, effort: typeof config.model_reasoning_effort === "string" ? config.model_reasoning_effort : null });
        } catch { finish(new Error("Codex returned an unsupported configuration response.")); }
      }
    });
    child.stdin.write(JSON.stringify({ id: 1, method: "initialize", params: { clientInfo: { name: "skilldiff", version: "0.1.0" } } }) + "\n");
  });
}

/** Read only model metadata from the isolated rollout, never model-written answer text. */
export function verifyCodexModel(home: string, stdout: string, expected: Execution): Execution {
  const events = stdout.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const thread = events.find((event) => event.type === "thread.started")?.thread_id;
  if (typeof thread !== "string" || !/^[a-zA-Z0-9-]+$/.test(thread)) throw new Error("Codex did not report a valid session ID.");
  const paths = findRollouts(join(home, "sessions"), thread);
  if (paths.length !== 1) throw new Error("Cannot verify the actual Codex model; no result will be uploaded.");
  const contexts = readFileSync(paths[0]!, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)).filter((event) => event.type === "turn_context");
  if (!contexts.length || contexts.some(({ payload }) => payload?.model !== expected.model || (expected.reasoning_effort !== null && payload?.effort !== expected.reasoning_effort))) {
    throw new Error("Codex model or reasoning effort differs from the comparison configuration; no result will be uploaded.");
  }
  const effort = contexts[0].payload.effort ?? null;
  if (contexts.some(({ payload }) => (payload.effort ?? null) !== effort)) throw new Error("Codex changed reasoning effort during the run.");
  return { ...expected, model: contexts[0].payload.model, reasoning_effort: effort };
}
