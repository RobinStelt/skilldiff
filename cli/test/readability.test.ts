import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { berechneLesbarkeitsScore } from "../src/metrics/readability.js";

describe("berechneLesbarkeitsScore", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("liefert 0 ohne Doku-Dateien", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-readability-"));
    expect(berechneLesbarkeitsScore(dir)).toBe(0);
  });

  it("bewertet kurze, einfache Sätze höher als verschachtelte Bandwurmsätze", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-readability-"));
    writeFileSync(
      join(dir, "einfach.md"),
      "Der Hund lief. Die Katze schlief. Es war schön.",
    );
    const einfachScore = berechneLesbarkeitsScore(dir);

    rmSync(dir, { recursive: true, force: true });
    dir = mkdtempSync(join(tmpdir(), "skill-ab-readability-"));
    writeFileSync(
      join(dir, "komplex.md"),
      "Obwohl die Implementierung der Konfigurationsverwaltung ursprünglich als Zwischenlösung konzipiert worden war, erwies sich die daraus resultierende Architekturentscheidung, welche zahlreiche Abhängigkeiten zwischen den einzelnen Modulen etablierte, letztendlich als grundlegend problematisch für die langfristige Wartbarkeit.",
    );
    const komplexScore = berechneLesbarkeitsScore(dir);

    expect(einfachScore).toBeGreaterThan(komplexScore);
  });
});
