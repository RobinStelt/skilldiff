import { getClaudeVersion } from "../src/versionInfo.js";
import { expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildAgentArgs, resolveAgentBin } from "../src/agents/adapter.js";
import { runComparison, cleanupWorkDirCopies } from "../src/orchestration/runOrchestrator.js";
import { realProcessRunner } from "../src/orchestration/processRunner.js";

// Explicit opt-in: uses the local Codex account; never uploads synthetic test data.
it.skipIf(!process.env.SKILL_AB_LIVE_CODEX_MODEL)("runs a real Codex A/B pair with isolated skill discovery", async () => {
  const project = mkdtempSync(join(tmpdir(), "skilldiff-live-project-"));
  const source = mkdtempSync(join(tmpdir(), "skilldiff-live-skill-"));
  writeFileSync(join(project, "README.md"), "Temporary integration test workspace.");
  writeFileSync(join(source, "SKILL.md"), "---\nname: smoke-test\ndescription: Use when writing answer.txt in the integration test.\n---\nThe designated test marker is SKILL. Write exactly that marker to answer.txt without a newline.\n");
  const execution = { agent: "codex" as const, model: process.env.SKILL_AB_LIVE_CODEX_MODEL!, reasoning_effort: "low", agent_version: await getClaudeVersion(resolveAgentBin("codex")) };
  try {
    const result = await runComparison({ agent: "codex", execution, originalWorkDir: project, skillId: "smoke-test", skillSourceDir: source,
      tier: "C", linkCapability: { symlink: false, junction: false }, checkCommand: null,
      buildInvocation: () => ({ bin: resolveAgentBin("codex"), args: buildAgentArgs(execution, "Use the smoke-test skill if available and write its designated test marker to answer.txt. If that skill is unavailable, write RESULT instead. Do not add a newline. This is a temporary integration test. Do not spawn subagents.") }),
      runner: realProcessRunner,
    });
    try {
      expect(readFileSync(join(result.withSkill.workDirCopy, "answer.txt"), "utf8")).toBe("SKILL");
      expect(readFileSync(join(result.withoutSkill.workDirCopy, "answer.txt"), "utf8")).toBe("RESULT");
      expect(result.withSkill.runOutcome.tokens).toBeGreaterThan(0);
      expect(result.withoutSkill.runOutcome.tokens).toBeGreaterThan(0);
      expect(result.withSkill.execution?.model).toBe(execution.model);
      expect(result.withoutSkill.execution?.model).toBe(execution.model);
      const report = { timestamp: new Date().toISOString(), purpose: "Skill discovery integration A/B test; not a skill efficacy benchmark", order_randomized: result.orderRandomized, with_skill: { execution: result.withSkill.execution, ...result.withSkill.runOutcome, marker: "SKILL", marker_check: true }, without_skill: { execution: result.withoutSkill.execution, ...result.withoutSkill.runOutcome, marker: "RESULT", marker_check: true } };
      console.log(JSON.stringify(report, null, 2));
      if (process.env.SKILL_AB_LIVE_REPORT) writeFileSync(process.env.SKILL_AB_LIVE_REPORT, JSON.stringify(report, null, 2) + "\n");
    } finally { cleanupWorkDirCopies(result); }
  } finally { rmSync(project, { recursive: true, force: true }); rmSync(source, { recursive: true, force: true }); }
}, 180_000);
