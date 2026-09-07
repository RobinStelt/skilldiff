import type { IsolationTier } from "@skilldiff/schema";
import type { Account } from "../accounts/accountStore.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Account history fully "ramped in" after this many days (briefing point 4). */
const REPUTATION_RAMP_DAYS = 30;
/** Never exactly 0 — a flagged/brand-new account still counts, just barely (briefing point 5). */
const REPUTATION_FLOOR = 0.02;
const FLAGGED_PENALTY = 0.2;

/**
 * "Neue Accounts fließen mit Gewicht nahe 0 ein, Gewicht steigt mit
 * Kontohistorie über Zeit" — a linear ramp over REPUTATION_RAMP_DAYS.
 * Deliberately not also a function of upload_count: that would let an
 * account game its own weight up by uploading a lot in a short time, which
 * is exactly the anomaly pattern flagged in src/anomaly.
 */
export function accountReputationWeight(account: Account, now: Date = new Date()): number {
  const ageDays = Math.max(0, (now.getTime() - account.createdAt.getTime()) / MS_PER_DAY);
  const ramped = REPUTATION_FLOOR + (1 - REPUTATION_FLOOR) * Math.min(1, ageDays / REPUTATION_RAMP_DAYS);
  return account.flagged ? ramped * FLAGGED_PENALTY : ramped;
}

/** Tier A > B > C, "nach demselben Prinzip wie der Build-Hash-Abgleich" (briefing point 4). */
const ISOLATION_TIER_WEIGHT: Record<IsolationTier, number> = {
  A: 1.0,
  B: 0.6,
  C: 0.15,
};

export function isolationTierWeight(tier: IsolationTier): number {
  return ISOLATION_TIER_WEIGHT[tier];
}

/**
 * "Ergebnisse von unmodifizierten, offiziell veröffentlichten CLI-Versionen
 * höher gewichten als von selbstkompilierten Versionen" — lower weight for
 * an unrecognized build hash, not zero: self-built CLIs are legitimate
 * (open source), just less trusted than an official release artifact.
 */
export function buildHashWeight(cliBuildHash: string, trustedHashes: ReadonlySet<string>): number {
  return trustedHashes.has(cliBuildHash) ? 1.0 : 0.5;
}

export interface WeightInputs {
  account: Account;
  isolationTier: IsolationTier;
  cliBuildHash: string;
  trustedHashes: ReadonlySet<string>;
  now?: Date;
}

/** Combined per-record weight used both at ingestion time and by aggregation queries. */
export function computeWeight(inputs: WeightInputs): number {
  return (
    accountReputationWeight(inputs.account, inputs.now) *
    isolationTierWeight(inputs.isolationTier) *
    buildHashWeight(inputs.cliBuildHash, inputs.trustedHashes)
  );
}
