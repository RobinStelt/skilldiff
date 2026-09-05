import { readFileSync } from "node:fs";

/** Hook commands receive their JSON payload via stdin (Claude Code hooks protocol) — read it all, synchronously, since these are short-lived one-shot invocations. */
export function readStdinSync(): string {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
