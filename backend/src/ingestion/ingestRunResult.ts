import type { RunResult, ValidationError } from "@skilldiff/schema";
import { validateRunResult } from "@skilldiff/schema";
import type { AccountStore } from "../accounts/accountStore.js";
import { verifySignature } from "../canonical.js";
import { computeWeight } from "../aggregation/weighting.js";
import type { RunResultRepo } from "./runResultRepo.js";
import type { ContentRepo } from "./contentRepo.js";

export interface IngestDeps {
  accountStore: AccountStore;
  runResultRepo: RunResultRepo;
  contentRepo: ContentRepo;
  trustedHashes: ReadonlySet<string>;
  now?: () => Date;
}

export type IngestOutcome =
  | { ok: true; runId: string; weight: number }
  | { ok: false; status: 400; error: "invalid_payload"; details: ValidationError[] }
  | { ok: false; status: 401; error: "unregistered_account" }
  | { ok: false; status: 401; error: "invalid_signature" }
  | { ok: false; status: 409; error: "duplicate_run_id" };

/**
 * Ingestion pipeline (briefing point 1). Order matters:
 *  1. schema validation — a structurally invalid record never gets far
 *     enough to leak whether the account/signature would have been valid.
 *  2. signature verification against the registered account key.
 *  3. duplicate check (idempotent retries of the same run_id are rejected,
 *     not silently re-stored or double-counted).
 *  4. weight computation + persistence, content_ref split into the
 *     separate restricted table (briefing point 2).
 * Every rejection is a clear, typed outcome — never a silent drop or a
 * half-write (briefing point 1 requirement).
 */
export async function ingestRunResult(rawPayload: unknown, deps: IngestDeps): Promise<IngestOutcome> {
  const validation = validateRunResult(rawPayload);
  if (Array.isArray(validation)) {
    return { ok: false, status: 400, error: "invalid_payload", details: validation };
  }
  const runResult: RunResult = validation;

  const account = await deps.accountStore.get(runResult.account_id);
  if (!account) {
    return { ok: false, status: 401, error: "unregistered_account" };
  }

  if (!verifySignature(runResult, account.signingSecret)) {
    return { ok: false, status: 401, error: "invalid_signature" };
  }

  if (await deps.runResultRepo.exists(runResult.run_id)) {
    return { ok: false, status: 409, error: "duplicate_run_id" };
  }

  const weight = computeWeight({
    account,
    isolationTier: runResult.isolation_tier,
    cliBuildHash: runResult.cli_build_hash,
    trustedHashes: deps.trustedHashes,
    now: deps.now?.(),
  });

  // Anomaly flags are computed by the periodic batch scan (src/anomaly),
  // not per-insert — see the comment on run_results.anomaly_flags.
  await deps.runResultRepo.insert(runResult, weight, []);

  if (runResult.content_opt_in && runResult.content_ref !== null) {
    await deps.contentRepo.insert(runResult.run_id, runResult.content_ref);
  }

  await deps.accountStore.incrementUploadCount(account.accountId);

  return { ok: true, runId: runResult.run_id, weight };
}
