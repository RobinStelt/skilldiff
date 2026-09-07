import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RunResult, ValidationError } from "@skilldiff/schema";
import { validateRunResult } from "@skilldiff/schema";

export type UploadResult =
  | { ok: true; mode: "mock" | "http"; target: string }
  | { ok: false; error: ValidationError[] | string };

export interface SubmitOptions {
  /** `null`/undefined => mock mode (writes locally instead of uploading). */
  endpointUrl?: string | null;
  /**
   * Needed only when `endpointUrl` is set. The backend must know this
   * account's HMAC secret to verify the signature at all (it never leaves
   * this machine any other way — see cli/src/config/localConfig.ts and
   * backend/src/accounts/accountStore.ts for why a real registration step
   * exists instead of trust-on-first-use). Registration is idempotent, so
   * this runs before every upload rather than needing its own one-time
   * setup step — cheap, and correct even if a previous registration
   * attempt never reached the server.
   */
  signingSecret?: string;
  mockDir?: string;
  fetchImpl?: typeof fetch;
}

/** POST /v1/accounts at the same origin as `endpointUrl`, regardless of what path segment the run-results endpoint itself uses. */
async function registerAccount(
  accountId: string,
  signingSecret: string,
  endpointUrl: string,
  fetchFn: typeof fetch,
): Promise<UploadResult | null> {
  const registrationUrl = new URL("/v1/accounts", endpointUrl).toString();
  let response: Response;
  try {
    response = await fetchFn(registrationUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ account_id: accountId, signing_secret: signingSecret }),
    });
  } catch (err) {
    return { ok: false, error: `Account registration failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  // 200 (already registered, same secret) and 201 (newly created) are both
  // fine — anything else (in particular 409, a different secret already
  // registered for this account_id) means the upload that follows would
  // fail signature verification anyway, so fail clearly now instead.
  if (response.status !== 200 && response.status !== 201) {
    return { ok: false, error: `Account registration failed: HTTP ${response.status} from ${registrationUrl}` };
  }
  return null;
}

/**
 * Always validates against the schema package BEFORE anything is sent
 * (Briefing 03 acceptance criterion).
 */
export async function submitRunResult(payload: unknown, options: SubmitOptions = {}): Promise<UploadResult> {
  const validationResult = validateRunResult(payload);
  if (Array.isArray(validationResult)) {
    return { ok: false, error: validationResult };
  }
  const validated: RunResult = validationResult;

  if (!options.endpointUrl) {
    const targetDir = options.mockDir ?? join(process.cwd(), ".skill-ab-mock-uploads");
    mkdirSync(targetDir, { recursive: true });
    const targetFile = join(targetDir, `${validated.run_id}.json`);
    writeFileSync(targetFile, JSON.stringify(validated, null, 2), "utf-8");
    return { ok: true, mode: "mock", target: targetFile };
  }

  const fetchFn = options.fetchImpl ?? fetch;

  if (options.signingSecret) {
    const registrationError = await registerAccount(validated.account_id, options.signingSecret, options.endpointUrl, fetchFn);
    if (registrationError) return registrationError;
  }

  const response = await fetchFn(options.endpointUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validated),
  });
  if (!response.ok) {
    return { ok: false, error: `Upload failed: HTTP ${response.status}` };
  }
  return { ok: true, mode: "http", target: options.endpointUrl };
}
