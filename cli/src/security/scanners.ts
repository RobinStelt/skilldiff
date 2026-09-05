import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SeverityCounts } from "@marktplatz/schema";
import { emptySeverityCounts } from "./severityCounts.js";

const execAsync = promisify(exec);

/**
 * Runs a scanner and returns its stdout — even if the process exits with a
 * non-zero code because it reported findings (common for
 * Semgrep/Bandit/npm audit). `null` is only returned for "command not
 * found" and similar (scanner simply unavailable — not an error case).
 */
async function stdoutOrNull(command: string, cwd: string): Promise<string | null> {
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

export async function scanWithSemgrep(dir: string): Promise<SeverityCounts> {
  const stdout = await stdoutOrNull("semgrep --config auto --json --quiet", dir);
  const counts = emptySeverityCounts();
  if (!stdout) return counts;
  try {
    const parsed = JSON.parse(stdout) as SemgrepResult;
    for (const result of parsed.results ?? []) {
      switch ((result.extra?.severity ?? "").toUpperCase()) {
        case "ERROR":
          counts.high += 1;
          break;
        case "WARNING":
          counts.medium += 1;
          break;
        case "INFO":
          counts.low += 1;
          break;
      }
    }
  } catch {
    // Unparseable output (e.g. a Semgrep version change) — better report 0 than guess.
  }
  return counts;
}

interface NpmAuditResult {
  metadata?: { vulnerabilities?: { info?: number; low?: number; moderate?: number; high?: number; critical?: number } };
}

export async function scanWithNpmAudit(dir: string): Promise<SeverityCounts> {
  const counts = emptySeverityCounts();
  if (!existsSync(join(dir, "package.json"))) return counts;
  const stdout = await stdoutOrNull("npm audit --json", dir);
  if (!stdout) return counts;
  try {
    const parsed = JSON.parse(stdout) as NpmAuditResult;
    const v = parsed.metadata?.vulnerabilities ?? {};
    counts.critical = v.critical ?? 0;
    counts.high = v.high ?? 0;
    counts.medium = v.moderate ?? 0;
    counts.low = (v.low ?? 0) + (v.info ?? 0);
  } catch {
    // see above
  }
  return counts;
}

interface BanditResult {
  results?: Array<{ issue_severity?: string }>;
}

function hasPythonFiles(dir: string): boolean {
  try {
    return readdirSync(dir, { recursive: true }).some((f) => typeof f === "string" && f.endsWith(".py"));
  } catch {
    return false;
  }
}

export async function scanWithBandit(dir: string): Promise<SeverityCounts> {
  const counts = emptySeverityCounts();
  if (!hasPythonFiles(dir)) return counts;
  const stdout = await stdoutOrNull(`bandit -r . -f json`, dir);
  if (!stdout) return counts;
  try {
    const parsed = JSON.parse(stdout) as BanditResult;
    for (const result of parsed.results ?? []) {
      switch ((result.issue_severity ?? "").toUpperCase()) {
        case "HIGH":
          counts.high += 1;
          break;
        case "MEDIUM":
          counts.medium += 1;
          break;
        case "LOW":
          counts.low += 1;
          break;
      }
    }
  } catch {
    // see above
  }
  return counts;
}
