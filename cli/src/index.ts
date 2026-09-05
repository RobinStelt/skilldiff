#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runCommand } from "./commands/run.js";

const program = new Command();

program
  .name("skill-ab")
  .description(
    "Führt eine Aufgabe automatisch einmal mit und einmal ohne einen Skill aus, misst automatisiert " +
      "(kein manuelles Rating) und trägt das Ergebnis zum Skill-A/B-Marktplatz bei.",
  )
  .version("0.1.0");

program
  .command("run")
  .description("Vergleichslauf für einen Skill starten")
  .requiredOption("--skill <id>", "ID des zu testenden Skills")
  .requiredOption("--dir <pfad>", "Arbeitsverzeichnis der Aufgabe")
  .requiredOption("--aufgabe <text>", "Aufgabenbeschreibung, die an Claude Code übergeben wird")
  .option(
    "--skill-source <pfad>",
    "Verzeichnis der Skill-Quelle — MUSS physisch außerhalb von --dir liegen (Tier A/B)",
  )
  .option("--check <kommando>", "Prüfkommando für Erfolg, z.B. \"npm test\" — Exit-Code entscheidet, kein Rating")
  .option("--claude-bin <pfad>", "Pfad/Name der claude-Binary", "claude")
  .option("--endpoint <url>", "Backend-Endpoint für den Upload (weggelassen = lokaler Mock, Phase 3 noch nicht fertig)")
  .option("--docker-image <image>", "Image für Tier-A-Läufe (muss die claude-CLI enthalten)")
  .action(async (opts) => {
    try {
      await runCommand({
        skillId: opts.skill,
        workDir: opts.dir,
        aufgabe: opts.aufgabe,
        skillSourceDir: opts.skillSource,
        checkCommand: opts.check,
        claudeBin: opts.claudeBin,
        endpointUrl: opts.endpoint,
        dockerImage: opts.dockerImage,
      });
    } catch (err) {
      console.error(pc.red("Fehler:"), err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
