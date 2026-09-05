import { describe, expect, it } from "vitest";
import { runCondition, parseClaudeUsage } from "../src/orchestration/runCondition.js";
import type { ProcessRunner } from "../src/orchestration/processRunner.js";

describe("parseClaudeUsage", () => {
  it("summiert alle Token-Kategorien aus dem claude --output-format json Objekt", () => {
    const stdout = JSON.stringify({
      duration_ms: 4200,
      usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 10, cache_read_input_tokens: 5 },
    });
    expect(parseClaudeUsage(stdout)).toEqual({ tokens: 165, dauerMs: 4200 });
  });

  it("fällt bei unparsebarer Ausgabe auf 0 zurück, statt zu werfen", () => {
    expect(parseClaudeUsage("kein json")).toEqual({ tokens: 0, dauerMs: 0 });
  });
});

function fakeRunner(antworten: Record<string, { stdout: string; exitCode: number }>): ProcessRunner {
  return {
    async run(cmd) {
      const antwort = antworten[cmd];
      if (!antwort) throw new Error(`Kein Fake-Ergebnis für Kommando "${cmd}" konfiguriert`);
      return { stdout: antwort.stdout, stderr: "", exitCode: antwort.exitCode };
    },
  };
}

describe("runCondition", () => {
  it("erfolg=null, wenn kein Prüfkommando angegeben ist", async () => {
    const runner = fakeRunner({
      claude: { stdout: JSON.stringify({ duration_ms: 1000, usage: { input_tokens: 10, output_tokens: 10 } }), exitCode: 0 },
    });
    const ergebnis = await runCondition({
      runner,
      claudeBin: "claude",
      claudeArgs: [],
      workDir: ".",
      env: {},
      checkCommand: null,
    });
    expect(ergebnis.erfolg).toBeNull();
    expect(ergebnis.tokens).toBe(20);
    expect(ergebnis.dauer_sek).toBe(1);
  });

  it("erfolg=true/false ausschließlich aus dem Exit-Code des Prüfkommandos, nie aus claude selbst", async () => {
    const runner = fakeRunner({
      claude: { stdout: JSON.stringify({ duration_ms: 500, usage: {} }), exitCode: 0 },
      "npm test": { stdout: "", exitCode: 1 },
    });
    const ergebnis = await runCondition({
      runner,
      claudeBin: "claude",
      claudeArgs: [],
      workDir: ".",
      env: {},
      checkCommand: { cmd: "npm test", args: [] },
    });
    expect(ergebnis.erfolg).toBe(false);
  });
});
