import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractLatestUsageFromTranscript } from "../../src/shadow/transcriptUsage.js";

describe("extractLatestUsageFromTranscript", () => {
  let dir: string;

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeTranscript(lines: unknown[]): string {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-transcript-"));
    const path = join(dir, "transcript.jsonl");
    writeFileSync(path, lines.map((l) => JSON.stringify(l)).join("\n"));
    return path;
  }

  it("returns null for a missing file", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-transcript-"));
    expect(extractLatestUsageFromTranscript(join(dir, "does-not-exist.jsonl"))).toBeNull();
  });

  it("sums usage from a message.usage shape (last matching line)", () => {
    const path = writeTranscript([
      { type: "user", message: { role: "user", content: "hi" } },
      { type: "assistant", message: { role: "assistant", usage: { input_tokens: 10, output_tokens: 20 } } },
    ]);
    expect(extractLatestUsageFromTranscript(path)).toBe(30);
  });

  it("sums usage from a top-level usage shape", () => {
    const path = writeTranscript([{ usage: { input_tokens: 5, output_tokens: 5, cache_read_input_tokens: 100 } }]);
    expect(extractLatestUsageFromTranscript(path)).toBe(110);
  });

  it("picks the LAST usage entry, not the first", () => {
    const path = writeTranscript([
      { message: { usage: { input_tokens: 1, output_tokens: 1 } } },
      { message: { usage: { input_tokens: 50, output_tokens: 50 } } },
    ]);
    expect(extractLatestUsageFromTranscript(path)).toBe(100);
  });

  it("returns null (not 0) when no line has a recognizable usage object", () => {
    const path = writeTranscript([{ type: "user", message: { role: "user", content: "hi" } }]);
    expect(extractLatestUsageFromTranscript(path)).toBeNull();
  });

  it("returns null on unparseable lines instead of throwing", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-transcript-"));
    const path = join(dir, "transcript.jsonl");
    writeFileSync(path, "not json\n{also not json");
    expect(extractLatestUsageFromTranscript(path)).toBeNull();
  });
});
