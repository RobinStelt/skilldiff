import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RunResult, ValidationError } from "@marktplatz/schema";
import { validateRunResult } from "@marktplatz/schema";

export type UploadResult =
  | { ok: true; mode: "mock" | "http"; target: string }
  | { ok: false; error: ValidationError[] | string };

export interface SubmitOptions {
  /** `null`/undefined => mock mode (no real backend endpoint exists yet, Phase 3). */
  endpointUrl?: string | null;
  mockDir?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Always validates against the schema package BEFORE anything is sent
 * (Briefing 03 acceptance criterion). No backend endpoint exists in this
 * phase yet — omitting `endpointUrl` runs against a local mock (writes the
 * validated payload to a file), but is structurally identical to the later
 * real submission.
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
