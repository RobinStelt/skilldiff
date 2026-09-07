import pc from "picocolors";
import type { RunOutcome } from "@skilldiff/schema";

function percentDelta(withSkill: number, withoutSkill: number): string {
  if (withoutSkill === 0) return withSkill === 0 ? "±0%" : "n/a";
  const delta = ((withoutSkill - withSkill) / withoutSkill) * 100;
  const sign = delta >= 0 ? "-" : "+"; // "less" when delta is positive
  return `${sign}${Math.abs(Math.round(delta))}%`;
}

function successText(success: boolean | null): string {
  if (success === null) return "no check command (n/a)";
  return success ? "succeeded" : "failed";
}

/**
 * Immediate local benefit (briefing point 7) — independent of the
 * marketplace upload, the CLI shows directly in the console what the skill
 * did for THIS user.
 */
export function showLocalDelta(params: { skillId: string; withSkill: RunOutcome; withoutSkill: RunOutcome }): void {
  const { skillId, withSkill, withoutSkill } = params;
  console.log(pc.bold(`\nResult for skill "${skillId}":\n`));
  console.log(`  Tokens:          with ${withSkill.tokens} / without ${withoutSkill.tokens}  (${percentDelta(withSkill.tokens, withoutSkill.tokens)} tokens)`);
  console.log(`  Duration:        with ${withSkill.duration_sec}s / without ${withoutSkill.duration_sec}s  (${percentDelta(withSkill.duration_sec, withoutSkill.duration_sec)} time)`);
  console.log(`  Success with:    ${successText(withSkill.success)}`);
  console.log(`  Success without: ${successText(withoutSkill.success)}`);
  console.log();
}
