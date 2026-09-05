import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Actually checks (doesn't guess) whether Docker or Podman is functional
 * locally — `docker info`/`podman info` fails if the daemon isn't running,
 * even if the binary is installed.
 */
export async function detectContainerRuntime(): Promise<"docker" | "podman" | null> {
  for (const bin of ["docker", "podman"] as const) {
    try {
      await execFileAsync(bin, ["info"], { timeout: 5000 });
      return bin;
    } catch {
      // Binary missing, daemon not running, or no permission — try the next option.
    }
  }
  return null;
}
