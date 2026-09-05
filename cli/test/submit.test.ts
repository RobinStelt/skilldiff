import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { submitRunResult } from "../src/upload/submit.js";
import { buildRunResult } from "../src/buildRunResult.js";

const validRunResult = buildRunResult({
  skillId: "skill_test",
  accountId: "acct_test",
  signingSecret: "secret",
  category: "other",
  sizeBucket: "small",
  isolationTier: "C",
  withSkillRunOutcome: { success: null, tokens: 100, duration_sec: 5 },
  withoutSkillRunOutcome: { success: null, tokens: 120, duration_sec: 6 },
  securityDelta: null,
  withSkillMetrics: null,
  withoutSkillMetrics: null,
  contentOptIn: false,
  contentRef: null,
  orderRandomized: true,
  claudeVersion: "claude-sonnet-5",
  cliVersion: "0.1.0",
  cliBuildHash: "abc123",
});

describe("submitRunResult", () => {
  let mockDir: string;

  afterEach(() => {
    if (mockDir) rmSync(mockDir, { recursive: true, force: true });
  });

  it("writes a validated file in mock mode (no endpointUrl)", async () => {
    mockDir = mkdtempSync(join(tmpdir(), "skill-ab-mock-"));
    const result = await submitRunResult(validRunResult, { mockDir });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mode).toBe("mock");
      expect(existsSync(result.target)).toBe(true);
      const saved = JSON.parse(readFileSync(result.target, "utf-8"));
      expect(saved.run_id).toBe(validRunResult.run_id);
    }
  });

  it("rejects invalid payloads BEFORE anything is written/sent", async () => {
    mockDir = mkdtempSync(join(tmpdir(), "skill-ab-mock-"));
    const invalid = { ...validRunResult, isolation_tier: "Z" };
    const result = await submitRunResult(invalid, { mockDir });
    expect(result.ok).toBe(false);
    expect(readdirSync(mockDir)).toHaveLength(0);
  });
});
