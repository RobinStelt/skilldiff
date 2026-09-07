import { describe, expect, it } from "vitest";
import { resolveConditionOutcomes } from "../../src/shadow/worker.js";
import type { RunOutcome } from "@skilldiff/schema";

function outcome(tokens: number): RunOutcome {
  return { success: true, tokens, duration_sec: 1 };
}

describe("resolveConditionOutcomes", () => {
  it("maps foreground=with_skill correctly (real turn had the skill linked)", () => {
    const { withSkill, withoutSkill } = resolveConditionOutcomes(
      "with_skill",
      { runOutcome: outcome(100), workDirCopy: "C:\\real-cwd" },
      { runOutcome: outcome(200), workDirCopy: "C:\\counterfactual" },
    );
    expect(withSkill).toEqual({ condition: "with_skill", runOutcome: outcome(100), workDirCopy: "C:\\real-cwd" });
    expect(withoutSkill).toEqual({
      condition: "without_skill",
      runOutcome: outcome(200),
      workDirCopy: "C:\\counterfactual",
    });
  });

  it("maps foreground=without_skill correctly (skill was NOT linked during the real turn)", () => {
    const { withSkill, withoutSkill } = resolveConditionOutcomes(
      "without_skill",
      { runOutcome: outcome(100), workDirCopy: "C:\\real-cwd" },
      { runOutcome: outcome(200), workDirCopy: "C:\\counterfactual" },
    );
    expect(withoutSkill).toEqual({
      condition: "without_skill",
      runOutcome: outcome(100),
      workDirCopy: "C:\\real-cwd",
    });
    expect(withSkill).toEqual({ condition: "with_skill", runOutcome: outcome(200), workDirCopy: "C:\\counterfactual" });
  });
});
