import type { Bedingung } from "./types.js";

const WORKSPACE_MOUNT = "/workspace";
const SKILL_MOUNT = "/skill-source";

/**
 * Baut die `docker run`-Argumente für Tier A.
 *
 * Wichtig: nur `workDir` (immer) und, im `mit_skill`-Fall, der EINE erlaubte
 * Skill-Ordner werden gemountet (Plan Abschnitt 3.2) — kein `-v $HOME:...`,
 * kein Zugriff auf den restlichen Host. Das Basis-Image muss `claude`
 * (Claude Code CLI) enthalten; welches Image das ist, ist konfigurierbar
 * (`--docker-image`), das Bauen/Pflegen eines solchen Images selbst ist
 * nicht Teil dieser Phase.
 *
 * Der Container bekommt ein leeres, isoliertes `$HOME` (`/home/runner`)
 * innerhalb des Containers ohnehin geschenkt — dort existieren von Haus aus
 * keine persönlichen Skills, das Problem aus Tier B/C entfällt hier.
 */
export function buildDockerRunArgs(params: {
  runtime: "docker" | "podman";
  image: string;
  workDir: string;
  skillSourceDir: string | null;
  skillId: string;
  bedingung: Bedingung;
  claudeInvocationArgs: string[];
  apiKeyEnvVar: string;
}): string[] {
  const { runtime, image, workDir, skillSourceDir, skillId, bedingung, claudeInvocationArgs, apiKeyEnvVar } = params;

  const args: string[] = [
    "run",
    "--rm",
    "--network",
    runtime === "docker" ? "bridge" : "slirp4netns", // nur für Modell-API-Zugriff nötig, kein Host-Netz
    "-v",
    `${workDir}:${WORKSPACE_MOUNT}`,
    "-w",
    WORKSPACE_MOUNT,
    "-e",
    `HOME=/home/runner`,
  ];

  if (process.env[apiKeyEnvVar]) {
    args.push("-e", `${apiKeyEnvVar}=${process.env[apiKeyEnvVar]}`);
  }

  if (bedingung === "mit_skill") {
    if (!skillSourceDir) {
      throw new Error("mit_skill-Bedingung in Tier A benötigt skillSourceDir");
    }
    // Nur DIESER eine Skill-Ordner wird gemountet — nicht der ganze
    // Skill-Vault, sonst könnte das Modell im Container Nachbar-Skills sehen.
    args.push("-v", `${skillSourceDir}:${SKILL_MOUNT}/${skillId}:ro`);
  }

  args.push(image, ...claudeInvocationArgs);
  return args;
}

export const dockerMountPaths = { WORKSPACE_MOUNT, SKILL_MOUNT };
