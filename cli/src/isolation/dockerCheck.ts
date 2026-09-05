import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Prüft tatsächlich (nicht geraten), ob Docker oder Podman lokal
 * funktionsfähig ist — `docker info`/`podman info` schlägt fehl, wenn der
 * Daemon nicht läuft, selbst wenn die Binary installiert ist.
 */
export async function detectContainerRuntime(): Promise<"docker" | "podman" | null> {
  for (const bin of ["docker", "podman"] as const) {
    try {
      await execFileAsync(bin, ["info"], { timeout: 5000 });
      return bin;
    } catch {
      // Binary fehlt, Daemon läuft nicht, oder keine Berechtigung — nächste Option probieren.
    }
  }
  return null;
}
