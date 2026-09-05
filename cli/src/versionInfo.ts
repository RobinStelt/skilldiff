import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

export async function ermittleClaudeVersion(claudeBin: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`"${claudeBin}" --version`);
    return stdout.trim();
  } catch {
    return "unbekannt";
  }
}

export function ermittleCliVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Build-Hash zum Abgleich gegen Client-Manipulation (Plan Abschnitt 7,
 * Restrisiko "Client-Manipulation"). Bevorzugt der Git-Commit-Hash dieses
 * CLI-Checkouts; fällt auf einen Hash des installierten package.json
 * zurück, wenn kein Git-Repo vorhanden ist (z.B. bei npm-Installation ohne
 * .git-Ordner).
 */
export async function ermittleCliBuildHash(): Promise<string> {
  try {
    const { stdout } = await execAsync("git rev-parse HEAD", { cwd: __dirname });
    return stdout.trim();
  } catch {
    const pkgInhalt = readFileSync(join(__dirname, "..", "package.json"), "utf-8");
    return createHash("sha256").update(pkgInhalt).digest("hex").slice(0, 12);
  }
}
