import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bestimmeGroessenklasse } from "../src/category/sizeBucket.js";

describe("bestimmeGroessenklasse", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("klassifiziert wenige Dateien als klein", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-size-"));
    writeFileSync(join(dir, "a.ts"), "");
    writeFileSync(join(dir, "b.ts"), "");
    expect(bestimmeGroessenklasse(dir)).toBe("klein");
  });

  it("klassifiziert viele Dateien als groß", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-size-"));
    for (let i = 0; i < 200; i++) {
      writeFileSync(join(dir, `datei-${i}.ts`), "");
    }
    expect(bestimmeGroessenklasse(dir)).toBe("groß");
  });

  it("ignoriert node_modules bei der Zählung", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-size-"));
    mkdirSync(join(dir, "node_modules", "irgendwas"), { recursive: true });
    for (let i = 0; i < 500; i++) {
      writeFileSync(join(dir, "node_modules", "irgendwas", `f${i}.js`), "");
    }
    writeFileSync(join(dir, "index.ts"), "");
    expect(bestimmeGroessenklasse(dir)).toBe("klein");
  });
});
