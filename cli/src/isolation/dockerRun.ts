import type { Condition } from "./types.js";

const WORKSPACE_MOUNT = "/workspace";
const SKILL_MOUNT = "/skill-source";

/**
 * Builds the `docker run` arguments for Tier A.
 *
 * Important: only `workDir` (always) and, in the `with_skill` case, the
 * one allowed skill folder are mounted (plan section 3.2) — no
 * `-v $HOME:...`, no access to the rest of the host. The base image must
 * contain `claude` (Claude Code CLI); which image that is is configurable
 * (`--docker-image`) — building/maintaining such an image is not part of
 * this phase.
 *
 * The container gets an empty, isolated `$HOME` (`/home/runner`) inside the
 * container for free anyway — no personal skills exist there by
 * construction, so the Tier B/C problem doesn't arise here.
 */
export function buildDockerRunArgs(params: {
  runtime: "docker" | "podman";
  image: string;
  workDir: string;
  skillSourceDir: string | null;
  skillId: string;
  condition: Condition;
  claudeInvocationArgs: string[];
  apiKeyEnvVar: string;
}): string[] {
  const { runtime, image, workDir, skillSourceDir, skillId, condition, claudeInvocationArgs, apiKeyEnvVar } = params;

  const args: string[] = [
    "run",
    "--rm",
    "--network",
    runtime === "docker" ? "bridge" : "slirp4netns", // only needed for model API access, no host network
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

  if (condition === "with_skill") {
    if (!skillSourceDir) {
      throw new Error("with_skill condition in Tier A requires skillSourceDir");
    }
    // Only THIS ONE skill folder is mounted — not the whole skill vault,
    // otherwise the model inside the container could see sibling skills.
    args.push("-v", `${skillSourceDir}:${SKILL_MOUNT}/${skillId}:ro`);
  }

  args.push(image, ...claudeInvocationArgs);
  return args;
}

export const dockerMountPaths = { WORKSPACE_MOUNT, SKILL_MOUNT };
