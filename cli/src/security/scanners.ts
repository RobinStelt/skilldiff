import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SeverityCounts } from "@marktplatz/schema";
import { leereSeverityCounts } from "./severityCounts.js";

const execAsync = promisify(exec);

/**
 * Führt einen Scanner aus und liefert dessen stdout — auch wenn der Prozess
 * mit Exit-Code != 0 endet, weil er Findings gemeldet hat (üblich bei
 * Semgrep/Bandit/npm audit). Nur bei "Kommando nicht gefunden" o.ä. wird
 * `null` zurückgegeben (Scanner schlicht nicht verfügbar — kein Fehlerfall).
 */
async function stdoutOderNull(command: string, cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(command, { cwd, maxBuffer: 20 * 1024 * 1024 });
    return stdout;
  } catch (err) {
    const e = err as { stdout?: string; code?: string };
    if (typeof e.stdout === "string" && e.stdout.length > 0) {
      return e.stdout;
    }
    return null;
  }
}

interface SemgrepResult {
  results?: Array<{ extra?: { severity?: string } }>;
}

export async function scanMitSemgrep(dir: string): Promise<SeverityCounts> {
  const stdout = await stdoutOderNull("semgrep --config auto --json --quiet", dir);
  const counts = leereSeverityCounts();
  if (!stdout) return counts;
  try {
    const parsed = JSON.parse(stdout) as SemgrepResult;
    for (const result of parsed.results ?? []) {
      switch ((result.extra?.severity ?? "").toUpperCase()) {
        case "ERROR":
          counts.hoch += 1;
          break;
        case "WARNING":
          counts.mittel += 1;
          break;
        case "INFO":
          counts.niedrig += 1;
          break;
      }
    }
  } catch {
    // Unparsebare Ausgabe (z.B. Semgrep-Versionswechsel) — lieber 0 melden als raten.
  }
  return counts;
}

interface NpmAuditResult {
  metadata?: { vulnerabilities?: { info?: number; low?: number; moderate?: number; high?: number; critical?: number } };
}

export async function scanMitNpmAudit(dir: string): Promise<SeverityCounts> {
  const counts = leereSeverityCounts();
  if (!existsSync(join(dir, "package.json"))) return counts;
  const stdout = await stdoutOderNull("npm audit --json", dir);
  if (!stdout) return counts;
  try {
    const parsed = JSON.parse(stdout) as NpmAuditResult;
    const v = parsed.metadata?.vulnerabilities ?? {};
    counts.kritisch = v.critical ?? 0;
    counts.hoch = v.high ?? 0;
    counts.mittel = v.moderate ?? 0;
    counts.niedrig = (v.low ?? 0) + (v.info ?? 0);
  } catch {
    // s.o.
  }
  return counts;
}

interface BanditResult {
  results?: Array<{ issue_severity?: string }>;
}

function hatPythonDateien(dir: string): boolean {
  try {
    return readdirSync(dir, { recursive: true }).some((f) => typeof f === "string" && f.endsWith(".py"));
  } catch {
    return false;
  }
}

export async function scanMitBandit(dir: string): Promise<SeverityCounts> {
  const counts = leereSeverityCounts();
  if (!hatPythonDateien(dir)) return counts;
  const stdout = await stdoutOderNull(`bandit -r . -f json`, dir);
  if (!stdout) return counts;
  try {
    const parsed = JSON.parse(stdout) as BanditResult;
    for (const result of parsed.results ?? []) {
      switch ((result.issue_severity ?? "").toUpperCase()) {
        case "HIGH":
          counts.hoch += 1;
          break;
        case "MEDIUM":
          counts.mittel += 1;
          break;
        case "LOW":
          counts.niedrig += 1;
          break;
      }
    }
  } catch {
    // s.o.
  }
  return counts;
}
