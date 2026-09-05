import type { Condition } from "../isolation/types.js";

export interface Order {
  first: Condition;
  second: Condition;
  randomized: boolean;
}

/**
 * Randomizes which condition runs first (plan section 3.1/4, field
 * `order_randomized`). `rng` is injectable so tests stay deterministic —
 * production code uses `Math.random`.
 */
export function randomizeOrder(rng: () => number = Math.random): Order {
  const withSkillFirst = rng() < 0.5;
  return {
    first: withSkillFirst ? "with_skill" : "without_skill",
    second: withSkillFirst ? "without_skill" : "with_skill",
    randomized: true,
  };
}
