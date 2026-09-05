export { detectIsolationTier } from "./detectTier.js";
export { detectLinkCapability, probeSymlinkCapability, probeJunctionCapability } from "./linkCapability.js";
export { detectContainerRuntime } from "./dockerCheck.js";
export {
  createIsolatedHome,
  applyTierBGate,
  assertSkillSourceOutsideWorkDir,
  tierRequiresOutsideSourceCheck,
  isSkillLinked,
} from "./gating.js";
export type { IsolatedHome } from "./gating.js";
export { buildDockerRunArgs, dockerMountPaths } from "./dockerRun.js";
export type { LinkCapability, TierDetectionResult, Condition } from "./types.js";
