import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { submitRunResult } from "../src/upload/submit.js";
import { buildRunResult } from "../src/buildRunResult.js";

const validRunResult = buildRunResult({
  skillId: "skill_test",
  skillContentHash: "a".repeat(64),
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

  it("registers the account (POST /v1/accounts at the endpoint's origin) before uploading, when a signingSecret is given", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: url.toString(), body: init?.body ? JSON.parse(init.body as string) : null });
      return new Response("{}", { status: url.toString().includes("/v1/accounts") ? 201 : 200 });
    }) as typeof fetch;

    const result = await submitRunResult(validRunResult, {
      endpointUrl: "http://example.com/v1/run-results",
      signingSecret: "secret",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.url).toBe("http://example.com/v1/accounts");
    expect(calls[0]!.body).toEqual({ account_id: validRunResult.account_id, signing_secret: "secret" });
    expect(calls[1]!.url).toBe("http://example.com/v1/run-results");
  });

  it("aborts the upload (never calls run-results) when registration is rejected", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string | URL) => {
      calls.push(url.toString());
      return new Response("{}", { status: 409 });
    }) as typeof fetch;

    const result = await submitRunResult(validRunResult, {
      endpointUrl: "http://example.com/v1/run-results",
      signingSecret: "secret",
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    expect(calls).toEqual(["http://example.com/v1/accounts"]);
  });

  it("skips registration entirely when no signingSecret is given (e.g. shadow mode reusing an already-registered account)", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string | URL) => {
      calls.push(url.toString());
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    await submitRunResult(validRunResult, { endpointUrl: "http://example.com/v1/run-results", fetchImpl });

    expect(calls).toEqual(["http://example.com/v1/run-results"]);
  });
});
