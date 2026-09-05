import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { erkenneKategorie } from "../src/category/detectCategory.js";

describe("erkenneKategorie", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-category-"));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("erkennt debugging an Stichworten in der Aufgabe", () => {
    expect(erkenneKategorie({ aufgabe: "Behebe den Bug im Login-Flow", workDir: dir })).toBe("debugging");
  });

  it("erkennt refactoring an Stichworten", () => {
    expect(erkenneKategorie({ aufgabe: "Bitte refactor das Modul, es ist zu komplex", workDir: dir })).toBe(
      "refactoring",
    );
  });

  it("erkennt doku an Stichworten", () => {
    expect(erkenneKategorie({ aufgabe: "Schreibe die README-Dokumentation neu", workDir: dir })).toBe("doku");
  });

  it("erkennt marketing an Stichworten", () => {
    expect(erkenneKategorie({ aufgabe: "Verfasse einen Werbetext für die Landingpage", workDir: dir })).toBe(
      "marketing",
    );
  });

  it("fällt bei neutraler Aufgabenbeschreibung auf Dateityp-Heuristik zurück (code -> feature)", () => {
    const codeDir = join(dir, "code-projekt");
    mkdirSync(codeDir, { recursive: true });
    writeFileSync(join(codeDir, "index.ts"), "export const x = 1;");
    expect(erkenneKategorie({ aufgabe: "Baue eine neue Sortierfunktion", workDir: codeDir })).toBe("feature");
  });

  it("erkennt sonstige bei leerem Verzeichnis ohne eindeutige Stichworte", () => {
    const leererDir = join(dir, "leer");
    mkdirSync(leererDir, { recursive: true });
    expect(erkenneKategorie({ aufgabe: "Mach mal was", workDir: leererDir })).toBe("sonstige");
  });
});
