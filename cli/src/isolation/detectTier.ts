import { detectContainerRuntime } from "./dockerCheck.js";
import { detectLinkCapability } from "./linkCapability.js";
import type { TierDetectionResult } from "./types.js";

/**
 * Detects the actually available isolation tier (plan, section 3.2).
 * Doesn't guess anything — every tier is confirmed by a real functional
 * test:
 *
 * - Tier A: `docker info`/`podman info` actually succeeds.
 * - Tier B: no container, but a real link mechanism (symlink, or, on
 *   Windows without Developer Mode, an NTFS junction) demonstrably works —
 *   verified by a write test, not assumed from the platform (see
 *   skill-matching-hook/skill-gate-test/LOKAL-PROTOKOLL.md: `ln -s` fails
 *   silently on a plain Windows install, without throwing an error).
 * - Tier C: neither A nor B possible → best-effort, lowest trust level.
 */
export interface DetectIsolationTierOptions {
  /**
   * Skips the Tier A container check even when Docker/Podman is actually
   * running. Real gap found running this for real: Tier A always wins
   * once `docker info` succeeds, with no way to opt out — but Tier A also
   * needs a pre-built `skill-ab/claude-runner:latest` image (not part of
   * this project, see dockerRun.ts) AND `ANTHROPIC_API_KEY` auth (the
   * container gets a fresh, empty `$HOME`, so a Pro/Max subscription
   * login's `.claude/.credentials.json` never reaches it). On a machine
   * that happens to run Docker for unrelated reasons (e.g. this project's
   * own docker-compose stack) but authenticates via subscription login,
   * Tier A silently fails every run — this flag is the escape hatch
   * (`skill-ab run --no-docker`).
   */
  skipContainer?: boolean;
}

export async function detectIsolationTier(options: DetectIsolationTierOptions = {}): Promise<TierDetectionResult> {
  const [containerRuntime, linkCapability] = await Promise.all([
    options.skipContainer ? Promise.resolve(null) : detectContainerRuntime(),
    Promise.resolve(detectLinkCapability()),
  ]);

  if (containerRuntime !== null) {
    return {
      tier: "A",
      reason: `${containerRuntime} info succeeded — container isolation available`,
      dockerAvailable: true,
      linkCapability,
    };
  }

  if (linkCapability.symlink || linkCapability.junction) {
    const mechanism = linkCapability.symlink ? "symlink" : "NTFS junction";
    return {
      tier: "B",
      reason: `No container, but ${mechanism} gating demonstrably works`,
      dockerAvailable: false,
      linkCapability,
    };
  }

  return {
    tier: "C",
    reason: "Neither container nor a working link mechanism available — best effort",
    dockerAvailable: false,
    linkCapability,
  };
}
