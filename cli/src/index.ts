#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runCommand } from "./commands/run.js";
import { watchAddCommand, watchRemoveCommand, watchListCommand } from "./commands/watch.js";

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
  .option("--skill <id>", "ID of the skill to test — omit together with --skill-source to pick one at random from your watch list (see \"watch add\")")
  .requiredOption("--dir <path>", "Working directory of the task")
  .requiredOption("--task <text>", "Task description passed to Claude Code")
  .option(
    "--skill-source <path>",
    "Directory of the skill source — MUST live physically outside --dir (Tier A/B)",
  )
  .option(
    "--check <command>",
    'Check command for success, e.g. "npm test" — exit code decides, no rating. Omit to auto-detect from the project (package.json/pytest/go.mod/Cargo.toml)',
  )
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

const watch = program.command("watch").description("Manage the skills `run` picks from when --skill is omitted");

watch
  .command("add")
  .description("Watch a skill so `run` can pick it without --skill/--skill-source every time")
  .requiredOption("--skill <id>", "ID of the skill")
  .requiredOption("--source <path>", "Directory of the skill source")
  .action((opts) => {
    try {
      watchAddCommand({ skillId: opts.skill, skillSourceDir: opts.source });
    } catch (err) {
      console.error(pc.red("Error:"), err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

watch
  .command("remove")
  .description("Stop watching a skill")
  .requiredOption("--skill <id>", "ID of the skill")
  .action((opts) => {
    try {
      watchRemoveCommand({ skillId: opts.skill });
    } catch (err) {
      console.error(pc.red("Error:"), err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

watch
  .command("list")
  .description("List watched skills")
  .action(() => {
    try {
      watchListCommand();
    } catch (err) {
      console.error(pc.red("Error:"), err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
