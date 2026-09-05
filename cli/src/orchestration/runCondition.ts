import type { Laufergebnis } from "@marktplatz/schema";
import type { ProcessRunner } from "./processRunner.js";

export interface ClaudeUsageJson {
  result?: string;
  is_error?: boolean;
  duration_ms?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

/**
 * Extrahiert Token- und Dauer-Zahlen aus der `--output-format json`-Ausgabe
 * von `claude -p`. Fällt auf `null`/0 zurück, wenn das Format sich geändert
 * hat oder das Parsen scheitert — bricht den Lauf NICHT ab, weil ein
 * unlesbares Nutzungsobjekt kein Grund ist, den ganzen Vergleich zu verwerfen.
 */
export function parseClaudeUsage(stdout: string): { tokens: number; dauerMs: number } {
  try {
    const parsed = JSON.parse(stdout) as ClaudeUsageJson;
    const usage = parsed.usage ?? {};
    const tokens =
      (usage.input_tokens ?? 0) +
      (usage.output_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0);
    return { tokens, dauerMs: parsed.duration_ms ?? 0 };
  } catch {
    return { tokens: 0, dauerMs: 0 };
  }
}

export interface RunConditionParams {
  runner: ProcessRunner;
  claudeBin: string;
  claudeArgs: string[];
  workDir: string;
  env: NodeJS.ProcessEnv;
  /**
   * Prüfkommando für Erfolg (Test/Lint/Build) — Exit-Code entscheidet.
   * `null`, wenn keines angegeben/erkannt werden konnte → `erfolg: null`.
   */
  checkCommand: { cmd: string; args: string[] } | null;
}

/**
 * Führt genau EINE Bedingung aus (Plan Abschnitt 5, Designentscheidung:
 * 1 Durchlauf statt 3 Wiederholungen). Kein manuelles Rating, keine
 * Mehrfachausführung — Erfolg kommt ausschließlich aus dem Exit-Code des
 * Prüfkommandos, niemals aus einer Nutzerabfrage.
 */
export async function runCondition(params: RunConditionParams): Promise<Laufergebnis> {
  const { runner, claudeBin, claudeArgs, workDir, env, checkCommand } = params;

  const start = Date.now();
  const claudeResult = await runner.run(claudeBin, claudeArgs, { cwd: workDir, env });
  const wallClockMs = Date.now() - start;
  const { tokens, dauerMs } = parseClaudeUsage(claudeResult.stdout);

  let erfolg: boolean | null = null;
  if (checkCommand) {
    const checkResult = await runner.run(checkCommand.cmd, checkCommand.args, { cwd: workDir, env });
    erfolg = checkResult.exitCode === 0;
  }

  return {
    erfolg,
    tokens,
    // duration_ms aus der claude-Ausgabe ist genauer (reine Modellzeit),
    // fällt aber auf die gemessene Wall-Clock-Zeit zurück, falls das Feld fehlt.
    dauer_sek: Math.round((dauerMs || wallClockMs) / 1000),
  };
}
