import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { schaetzeZyklomatischeKomplexitaet, ermittleDiffGroesse } from "../src/metrics/complexity.js";

describe("schaetzeZyklomatischeKomplexitaet", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("liefert 0 ohne Code-Dateien", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-complexity-"));
    expect(schaetzeZyklomatischeKomplexitaet(dir)).toBe(0);
  });

  it("zählt Verzweigungen höher als geradlinigen Code", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-complexity-"));
    writeFileSync(join(dir, "einfach.ts"), "export function f() { return 1; }");
    const einfach = schaetzeZyklomatischeKomplexitaet(dir);

    writeFileSync(
      join(dir, "verzweigt.ts"),
      "export function g(x: number) { if (x > 0) { for (let i=0;i<x;i++) { if (i % 2 === 0) { } } } else if (x < 0) {} return x; }",
    );
    const mitVerzweigt = schaetzeZyklomatischeKomplexitaet(dir);

    expect(mitVerzweigt).toBeGreaterThan(einfach);
  });
});

describe("ermittleDiffGroesse", () => {
  it("liefert 0 für identische Verzeichnisse", async () => {
    const a = mkdtempSync(join(tmpdir(), "skill-ab-diff-a-"));
    const b = mkdtempSync(join(tmpdir(), "skill-ab-diff-b-"));
    writeFileSync(join(a, "datei.txt"), "gleicher inhalt\n");
    writeFileSync(join(b, "datei.txt"), "gleicher inhalt\n");
    try {
      expect(await ermittleDiffGroesse(a, b)).toBe(0);
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(b, { recursive: true, force: true });
    }
  });

  it("zählt geänderte Zeilen zwischen unterschiedlichen Verzeichnissen", async () => {
    const a = mkdtempSync(join(tmpdir(), "skill-ab-diff-a-"));
    const b = mkdtempSync(join(tmpdir(), "skill-ab-diff-b-"));
    writeFileSync(join(a, "datei.txt"), "zeile1\nzeile2\n");
    writeFileSync(join(b, "datei.txt"), "zeile1\nzeile2\nzeile3\n");
    try {
      expect(await ermittleDiffGroesse(a, b)).toBeGreaterThan(0);
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(b, { recursive: true, force: true });
    }
  });
});
