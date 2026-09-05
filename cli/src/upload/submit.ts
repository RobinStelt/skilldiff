import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RunResult, ValidationError } from "@marktplatz/schema";
import { validateRunResult } from "@marktplatz/schema";

export type UploadResult =
  | { ok: true; modus: "mock" | "http"; ziel: string }
  | { ok: false; fehler: ValidationError[] | string };

export interface SubmitOptions {
  /** `null`/undefined => Mock-Modus (kein echter Backend-Endpoint existiert noch, Phase 3). */
  endpointUrl?: string | null;
  mockVerzeichnis?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Validiert zwingend gegen das Schema-Package, BEVOR irgendetwas gesendet
 * wird (Akzeptanzkriterium Briefing 03). Kein Backend-Endpoint existiert in
 * dieser Phase noch — `endpointUrl` weggelassen läuft gegen einen lokalen
 * Mock (schreibt die validierte Payload als Datei), ist aber strukturell
 * identisch zum späteren echten Versand.
 */
export async function sendeRunResult(payload: unknown, options: SubmitOptions = {}): Promise<UploadResult> {
  const validierungsErgebnis = validateRunResult(payload);
  if (Array.isArray(validierungsErgebnis)) {
    return { ok: false, fehler: validierungsErgebnis };
  }
  const validiert: RunResult = validierungsErgebnis;

  if (!options.endpointUrl) {
    const zielVerzeichnis = options.mockVerzeichnis ?? join(process.cwd(), ".skill-ab-mock-uploads");
    mkdirSync(zielVerzeichnis, { recursive: true });
    const zielDatei = join(zielVerzeichnis, `${validiert.run_id}.json`);
    writeFileSync(zielDatei, JSON.stringify(validiert, null, 2), "utf-8");
    return { ok: true, modus: "mock", ziel: zielDatei };
  }

  const fetchFn = options.fetchImpl ?? fetch;
  const response = await fetchFn(options.endpointUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validiert),
  });
  if (!response.ok) {
    return { ok: false, fehler: `Upload fehlgeschlagen: HTTP ${response.status}` };
  }
  return { ok: true, modus: "http", ziel: options.endpointUrl };
}
