import { describe, expect, it } from "vitest";
import {
  accountReputationWeight,
  buildHashWeight,
  computeWeight,
  isolationTierWeight,
} from "../src/aggregation/weighting.js";
import type { Account } from "../src/accounts/accountStore.js";

function account(overrides: Partial<Account> = {}): Account {
  return {
    accountId: "acct_1",
    signingSecret: "secret",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    uploadCount: 0,
    flagged: false,
    isSeedAccount: false,
    ...overrides,
  };
}

describe("accountReputationWeight", () => {
  it("is near zero for a brand-new account", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(accountReputationWeight(account({ createdAt: now }), now)).toBeLessThan(0.05);
  });

  it("reaches full weight once fully ramped in", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-03-01T00:00:00Z"); // well past the 30-day ramp
    expect(accountReputationWeight(account({ createdAt: created }), now)).toBe(1);
  });

  it("increases monotonically with account age", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const early = accountReputationWeight(account({ createdAt: created }), new Date("2026-01-05T00:00:00Z"));
    const later = accountReputationWeight(account({ createdAt: created }), new Date("2026-01-20T00:00:00Z"));
    expect(later).toBeGreaterThan(early);
  });

  it("penalizes a flagged account regardless of age", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-03-01T00:00:00Z");
    const clean = accountReputationWeight(account({ createdAt: created, flagged: false }), now);
    const flagged = accountReputationWeight(account({ createdAt: created, flagged: true }), now);
    expect(flagged).toBeLessThan(clean);
  });
});

describe("isolationTierWeight", () => {
  it("orders A > B > C", () => {
    expect(isolationTierWeight("A")).toBeGreaterThan(isolationTierWeight("B"));
    expect(isolationTierWeight("B")).toBeGreaterThan(isolationTierWeight("C"));
  });
});

describe("buildHashWeight", () => {
  it("trusts an official build hash more than an unknown one", () => {
    const trusted = new Set(["official-hash"]);
    expect(buildHashWeight("official-hash", trusted)).toBeGreaterThan(buildHashWeight("self-built", trusted));
  });

  it("never fully zeroes out a self-compiled build", () => {
    expect(buildHashWeight("self-built", new Set())).toBeGreaterThan(0);
  });
});

describe("computeWeight", () => {
  it("combines all three factors multiplicatively", () => {
    const trusted = new Set(["official-hash"]);
    const now = new Date("2026-06-01T00:00:00Z");
    const bestCase = computeWeight({
      account: account({ createdAt: new Date("2026-01-01T00:00:00Z") }),
      isolationTier: "A",
      cliBuildHash: "official-hash",
      trustedHashes: trusted,
      now,
    });
    const worstCase = computeWeight({
      account: account({ createdAt: now, flagged: true }),
      isolationTier: "C",
      cliBuildHash: "self-built",
      trustedHashes: trusted,
      now,
    });
    expect(bestCase).toBeGreaterThan(worstCase);
    expect(worstCase).toBeGreaterThan(0);
  });
});
