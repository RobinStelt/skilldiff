#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runCommand } from "./commands/run.js";

const program = new Command();

program
  .name("skill-ab")
  .description(
    "Runs a task automatically once with and once without a skill, measures it automatically " +
      "(no manual rating), and contributes the result to the Skill-A/B Marketplace.",
  )
  .version("0.1.0");

program
  .command("run")
  .description("Start a comparison run for a skill")
  .requiredOption("--skill <id>", "ID of the skill to test")
  .requiredOption("--dir <path>", "Working directory of the task")
  .requiredOption("--task <text>", "Task description passed to Claude Code")
  .option(
    "--skill-source <path>",
    "Directory of the skill source — MUST live physically outside --dir (Tier A/B)",
  )
  .option("--check <command>", "Check command for success, e.g. \"npm test\" — exit code decides, no rating")
  .option("--claude-bin <path>", "Path/name of the claude binary", "claude")
  .option("--endpoint <url>", "Backend endpoint for the upload (omitted = local mock, Phase 3 not built yet)")
  .option("--docker-image <image>", "Image for Tier A runs (must contain the claude CLI)")
  .action(async (opts) => {
    try {
      await runCommand({
        skillId: opts.skill,
        workDir: opts.dir,
        task: opts.task,
        skillSourceDir: opts.skillSource,
        checkCommand: opts.check,
        claudeBin: opts.claudeBin,
        endpointUrl: opts.endpoint,
        dockerImage: opts.dockerImage,
      });
    } catch (err) {
      console.error(pc.red("Error:"), err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
