import { describe, expect, it } from "vitest";
import { ingestRunResult } from "../src/ingestion/ingestRunResult.js";
import { createInMemoryAccountStore } from "../src/accounts/accountStore.js";
import { createFakeContentRepo, createFakeRunResultRepo } from "./helpers/fakeRepos.js";
import { buildSignedRunResult, buildUnsignedRunResult } from "./helpers/fixtures.js";

const SECRET = "s3cret";

function makeDeps(overrides: Partial<Parameters<typeof ingestRunResult>[1]> = {}) {
  const accountStore = createInMemoryAccountStore();
  const runResultRepo = createFakeRunResultRepo();
  const contentRepo = createFakeContentRepo();
  return {
    deps: {
      accountStore,
      runResultRepo,
      contentRepo,
      trustedHashes: new Set<string>(),
      ...overrides,
    },
    accountStore,
    runResultRepo,
    contentRepo,
  };
}

describe("ingestRunResult", () => {
  it("rejects a payload that violates the schema (acceptance criterion: security_delta set for a marketing run)", async () => {
    const { deps } = makeDeps();
    const invalid = {
      ...buildUnsignedRunResult({ category: "marketing" as never }),
      // marketing must have security_delta === null (schema.ts) — this is invalid.
      security_delta: { with_skill: { critical: 0, high: 0, medium: 0, low: 0 }, without_skill: { critical: 0, high: 0, medium: 0, low: 0 } },
      signature: "irrelevant-because-schema-check-runs-first",
    };
    const outcome = await ingestRunResult(invalid, deps);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toBe("invalid_payload");
  });

  it("rejects an upload from an account that never registered a signing secret", async () => {
    const { deps } = makeDeps();
    const runResult = buildSignedRunResult(SECRET);
    const outcome = await ingestRunResult(runResult, deps);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toBe("unregistered_account");
  });

  it("rejects a run result with a tampered field and thus an invalid signature (acceptance criterion)", async () => {
    const { deps, accountStore } = makeDeps();
    const runResult = buildSignedRunResult(SECRET);
    await accountStore.register(runResult.account_id, SECRET);

    const tampered = { ...runResult, cli_version: "9.9.9-tampered" };
    const outcome = await ingestRunResult(tampered, deps);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toBe("invalid_signature");
  });

  it("accepts a valid, correctly signed run result from a registered account", async () => {
    const { deps, runResultRepo, contentRepo } = makeDeps();
    const runResult = buildSignedRunResult(SECRET);
    await deps.accountStore.register(runResult.account_id, SECRET);

    const outcome = await ingestRunResult(runResult, deps);
    expect(outcome.ok).toBe(true);
    expect(runResultRepo.rows.has(runResult.run_id)).toBe(true);
    // content_opt_in: true + content_ref set -> lands in the separate table.
    expect(contentRepo.rows.get(runResult.run_id)).toBe(runResult.content_ref);
  });

  it("does not write to the content table when content_opt_in is false", async () => {
    const { deps, contentRepo } = makeDeps();
    const runResult = buildSignedRunResult(SECRET, { content_opt_in: false, content_ref: null });
    await deps.accountStore.register(runResult.account_id, SECRET);

    await ingestRunResult(runResult, deps);
    expect(contentRepo.rows.size).toBe(0);
  });

  it("rejects a duplicate run_id instead of double-storing it", async () => {
    const { deps } = makeDeps();
    const runResult = buildSignedRunResult(SECRET);
    await deps.accountStore.register(runResult.account_id, SECRET);

    const first = await ingestRunResult(runResult, deps);
    const second = await ingestRunResult(runResult, deps);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("duplicate_run_id");
  });
});
