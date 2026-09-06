#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runCommand } from "./commands/run.js";
import { watchAddCommand, watchRemoveCommand, watchListCommand } from "./commands/watch.js";
import { configSetCommand, configUnsetCommand, configShowCommand } from "./commands/config.js";
import {
  shadowInstallCommand,
  shadowUninstallCommand,
  shadowUserPromptSubmitCommand,
  shadowStopCommand,
  shadowWorkerRunCommand,
} from "./commands/shadow.js";

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
  .option(
    "--claude-bin <path>",
    "Path/name of the claude binary. Omit to use \"skill-ab config set claude-bin\" (if set) or auto-detection — " +
      "a hardcoded default here would always win over both.",
  )
  .option(
    "--endpoint <url>",
    "Backend endpoint for the upload. Omit to use \"skill-ab config set endpoint\" (if set), or run against a local mock",
  )
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

const config = program
  .command("config")
  .description("Persisted defaults for --endpoint/--claude-bin — what makes shadow mode work without repeating flags forever");

config
  .command("set <key> <value>")
  .description("Set a persisted default (\"endpoint\" or \"claude-bin\")")
  .action((key: string, value: string) => {
    try {
      configSetCommand(key, value);
    } catch (err) {
      console.error(pc.red("Error:"), err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

config
  .command("unset <key>")
  .description("Clear a persisted default")
  .action((key: string) => {
    try {
      configUnsetCommand(key);
    } catch (err) {
      console.error(pc.red("Error:"), err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

config
  .command("show")
  .description("Show current persisted defaults")
  .action(() => configShowCommand());

const shadow = program
  .command("shadow")
  .description(
    "Background comparison runs triggered by Claude Code hooks (opt-in per project) — " +
      "see cli/README.md, \"Shadow mode\"",
  );

shadow
  .command("install")
  .description("Register the shadow-mode hooks in a project's .claude/settings.json (idempotent, additive)")
  .requiredOption("--dir <path>", "Project directory")
  .action((opts) => {
    try {
      shadowInstallCommand({ dir: opts.dir });
    } catch (err) {
      console.error(pc.red("Error:"), err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

shadow
  .command("uninstall")
  .description("Remove the shadow-mode hooks from a project's .claude/settings.json")
  .requiredOption("--dir <path>", "Project directory")
  .action((opts) => {
    try {
      shadowUninstallCommand({ dir: opts.dir });
    } catch (err) {
      console.error(pc.red("Error:"), err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

// The three commands below are invoked BY Claude Code hooks / by
// shadowStopCommand's own detached spawn — not meant to be run by hand.
shadow
  .command("user-prompt-submit")
  .description("[internal, invoked by the UserPromptSubmit hook]")
  .action(() => {
    try {
      shadowUserPromptSubmitCommand();
    } catch {
      // Hook commands must never make Claude Code's own turn fail because
      // of a shadow-mode bug — fail silently, exit 0.
    }
  });

shadow
  .command("stop")
  .description("[internal, invoked by the Stop hook]")
  .action(() => {
    try {
      shadowStopCommand();
    } catch {
      // Same reasoning as user-prompt-submit above.
    }
  });

shadow
  .command("worker-run <sessionId>")
  .description("[internal, spawned detached by the Stop hook]")
  .action(async (sessionId: string) => {
    await shadowWorkerRunCommand(sessionId);
  });

program.parseAsync(process.argv);
