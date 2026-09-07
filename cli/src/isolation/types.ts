import type { IsolationTier } from "@skilldiff/schema";

export interface LinkCapability {
  /** Real POSIX symlinks work (e.g. macOS/Linux, or Windows with Developer Mode). */
  symlink: boolean;
  /** NTFS junction works (Windows fallback for directories, no admin/dev mode needed). */
  junction: boolean;
}

export interface TierDetectionResult {
  tier: IsolationTier;
  /** Human-readable reason this exact tier was detected (for logs/debugging). */
  reason: string;
  dockerAvailable: boolean;
  linkCapability: LinkCapability;
}

/**
 * How a skill source is made visible or hidden for a condition
 * ("with_skill"/"without_skill").
 */
export type Condition = "with_skill" | "without_skill";
