import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import type { RunResult } from "@skilldiff/schema";
import { canonicalJson } from "@skilldiff/schema";
import { buildApp, type AppDeps } from "../../src/app.js";
import { createPgAccountStore } from "../../src/accounts/accountStore.js";
import { createPgRunResultRepo } from "../../src/ingestion/runResultRepo.js";
import { computeHmac } from "../../src/canonical.js";
import { runAnomalyScan } from "../../src/anomaly/scan.js";
import { ANOMALY_PERFECT_SUCCESS_HETEROGENEOUS, ANOMALY_UPLOAD_BURST_SAME_SKILL } from "../../src/anomaly/detect.js";

const appUrl = process.env.TEST_DATABASE_URL_APP_ROLE;
// Cleanup-only: app_backend deliberately has no DELETE grant on accounts/
// run_results (db/migrations/001_init.sql — flagged data is down-weighted,
// never deleted, by design). A superuser connection is the only way to
// remove this test's rows afterward; reuses the same env var name
// scripts/migrate.ts already uses for "superuser/owner connection".
// Falls back to leaving the test rows in place (harmless — zz_-prefixed,
// same convention as the sibling catalog.test.ts) rather than failing the
// suite over cleanup specifically.
const migrationUrl = process.env.MIGRATION_DATABASE_URL;

/**
 * This is the one test in the suite that plays out an actual adversarial
 * scenario end to end against a real Postgres, rather than unit-testing
 * src/anomaly/detect.ts's pure functions against a synthetic in-memory
 * array (test/anomaly.test.ts) or the batch job's SQL in isolation. It
 * goes through the same door a real dishonest contributor would: register
 * an account over HTTP, sign every upload exactly the way the real CLI
 * does (buildSignedRunResult's non-integration sibling — see
 * test/helpers/fixtures.ts — signs identically, this just needs a
 * distinct account per run so it can't reuse that shared fixture), spam
 * one skill with suspiciously perfect results, then checks that both the
 * batch anomaly scan AND the reputation-weight formula it feeds
 * (src/aggregation/weighting.ts) actually respond — not just that a flag
 * gets written somewhere unused.
 */
describe.skipIf(!appUrl)("adversarial upload pattern is caught end to end (Postgres)", () => {
  // Unlike the sibling integration tests (catalog.test.ts, permissions.test.ts),
  // this one can't wrap everything in one BEGIN/ROLLBACK transaction on a
  // single borrowed client: src/anomaly/scan.ts's applyAnomalyFlags calls
  // `pool.connect()` internally to run its own transaction, which fails
  // ("Client has already been connected") against a PoolClient masquerading
  // as a Pool. So this uses a real Pool throughout and cleans up explicitly
  // in afterAll instead of rolling back.
  let pool: Pool;
  const accountId = `zz_anomaly_test_${randomUUID()}`;
  const signingSecret = "adversary-secret";
  const targetSkillId = `zz_anomaly_target_${randomUUID()}`;

  // "docs"/"marketing"/"other" are the three categories whose schema
  // doesn't demand code-shaped category_metrics (debugging/feature/
  // refactoring each need their own specific metrics object) — using
  // these three keeps the fixture simple while still clearing
  // MIN_DISTINCT_CATEGORIES (3) in src/anomaly/detect.ts.
  const CATEGORY_METRICS: Record<"docs" | "marketing" | "other", RunResult["category_metrics"]> = {
    docs: { with_skill: { readability_score: 82 }, without_skill: { readability_score: 71 } },
    marketing: null,
    other: null,
  };

  function sign(overrides: Partial<RunResult> & { category: "docs" | "marketing" | "other" }): RunResult {
    const base = {
      skill_id: targetSkillId,
      skill_content_hash: "a".repeat(64),
      account_id: accountId,
      size_bucket: "small" as const,
      isolation_tier: "B" as const,
      with_skill: { success: true, tokens: 100, duration_sec: 10 },
      without_skill: { success: false, tokens: 200, duration_sec: 20 },
      security_delta: null,
      category_metrics: CATEGORY_METRICS[overrides.category],
      // Deliberately not uploading content — keeps this test to a single
      // DB role/connection (see runResultRepo/contentRepo split in
      // ingestRunResult.ts; content_writer needs its own connection this
      // test doesn't set up, and doesn't need to for what it's checking).
      content_opt_in: false,
      content_ref: null,
      order_randomized: false,
      timestamp: new Date().toISOString(),
      claude_version: "claude-sonnet-5",
      cli_version: "0.1.0",
      // Deliberately not in trustedHashes — irrelevant to this test, but
      // realistic: a self-built adversarial CLI wouldn't have one either.
      cli_build_hash: "untrusted-build",
      ...overrides,
    };
    const signature = computeHmac(canonicalJson(base), signingSecret);
    return { ...base, signature } as RunResult;
  }

  function stubDeps(): Omit<AppDeps, "accountStore" | "runResultRepo"> {
    return {
      contentRepo: { insert: async () => { throw new Error("not expected to be called in this test"); } },
      trustedHashes: new Set(),
      getSkillMetrics: async () => [],
      getAllSkillMetrics: async () => [],
      listSkills: async () => ({ skills: [], nextCursor: null }),
      getSkillDetail: async () => null,
      getRawExportRecords: async () => [],
      adminUserStore: { getByUsername: async () => null },
      sessionStore: { create: async () => ({ token: "unused", expiresAt: new Date() }), verify: async () => null, revoke: async () => {} },
      skillMetadataStore: {
        get: async () => null,
        listAll: async () => [],
        upsert: async () => { throw new Error("not expected"); },
        delete: async () => { throw new Error("not expected"); },
        setGithubStars: async () => { throw new Error("not expected"); },
      },
    };
  }

  beforeAll(() => {
    pool = new Pool({ connectionString: appUrl });
  });

  afterAll(async () => {
    if (migrationUrl) {
      const superuser = new Pool({ connectionString: migrationUrl });
      await superuser.query("DELETE FROM run_results WHERE account_id = $1", [accountId]);
      await superuser.query("DELETE FROM accounts WHERE account_id = $1", [accountId]);
      await superuser.end();
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[anomaly.test.ts] MIGRATION_DATABASE_URL not set — leaving test rows for account ${accountId} in place`,
      );
    }
    if (pool) await pool.end();
  });

  it("flags a burst of suspiciously-perfect same-skill uploads, and the flag measurably lowers future weight", async () => {
    const app = buildApp({
      accountStore: createPgAccountStore(pool),
      runResultRepo: createPgRunResultRepo(pool),
      ...stubDeps(),
    });

    const register = await app.inject({
      method: "POST",
      url: "/v1/accounts",
      payload: { account_id: accountId, signing_secret: signingSecret },
    });
    expect(register.statusCode).toBe(201);

    // Baseline: one normal upload before the adversarial pattern starts,
    // so we have this same (brand new, unflagged) account's real weight
    // to compare against later — isolates the flagged-penalty's effect
    // from the age-ramp, which is ~identical between the two uploads
    // since they happen milliseconds apart.
    const baselineRes = await app.inject({
      method: "POST",
      url: "/v1/run-results",
      payload: sign({ run_id: `${accountId}_baseline`, category: "docs" }),
    });
    expect(baselineRes.statusCode).toBe(201);
    const baselineWeight = baselineRes.json().weight as number;
    expect(baselineWeight).toBeGreaterThan(0);

    // The adversarial pattern: 20 uploads (clears UPLOAD_BURST_THRESHOLD)
    // for the same skill, cycling through 4 categories (clears
    // MIN_DISTINCT_CATEGORIES) and every single one reporting success
    // (clears the perfect-success check) — exactly the two briefing-point-5
    // heuristics at once, the way a real "make my skill look good" attempt
    // plausibly would rather than tripping only one.
    const categories = ["docs", "marketing", "other"] as const;
    for (let i = 0; i < 20; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/v1/run-results",
        payload: sign({ run_id: `${accountId}_burst_${i}`, category: categories[i % categories.length]! }),
      });
      expect(res.statusCode).toBe(201);
    }

    const scanResult = await runAnomalyScan(pool);
    expect(scanResult.flaggedAccounts).toBeGreaterThanOrEqual(1);

    const accountRow = await pool.query("SELECT flagged FROM accounts WHERE account_id = $1", [accountId]);
    expect(accountRow.rows[0].flagged).toBe(true);

    const flaggedRunRow = await pool.query(
      "SELECT anomaly_flags FROM run_results WHERE run_id = $1",
      [`${accountId}_burst_0`],
    );
    expect(flaggedRunRow.rows[0].anomaly_flags).toEqual(
      expect.arrayContaining([ANOMALY_PERFECT_SUCCESS_HETEROGENEOUS, ANOMALY_UPLOAD_BURST_SAME_SKILL]),
    );

    // The consequence that actually matters: the NEXT upload from this now-
    // flagged account gets a real, measurably lower weight through the
    // exact same HTTP path a legitimate contributor uses — not just a flag
    // sitting in a column nothing reads.
    const afterFlagRes = await app.inject({
      method: "POST",
      url: "/v1/run-results",
      payload: sign({ run_id: `${accountId}_after_flag`, category: "marketing" }),
    });
    expect(afterFlagRes.statusCode).toBe(201);
    const afterFlagWeight = afterFlagRes.json().weight as number;

    // FLAGGED_PENALTY (weighting.ts) is 0.2 — allow a little slack for the
    // sub-millisecond age-ramp drift between the two measurements rather
    // than asserting an exact float.
    expect(afterFlagWeight).toBeLessThan(baselineWeight * 0.25);
    expect(afterFlagWeight).toBeGreaterThan(baselineWeight * 0.15);
  });
});
