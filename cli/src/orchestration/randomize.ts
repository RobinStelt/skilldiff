import type { Bedingung } from "../isolation/types.js";

export interface Reihenfolge {
  erste: Bedingung;
  zweite: Bedingung;
  randomisiert: boolean;
}

/**
 * Randomisiert, welche Bedingung zuerst läuft (Plan Abschnitt 3.1/4,
 * Feld `reihenfolge_randomisiert`). `rng` ist injizierbar, damit Tests
 * deterministisch bleiben — Produktionscode nutzt `Math.random`.
 */
export function randomisiereReihenfolge(rng: () => number = Math.random): Reihenfolge {
  const mitZuerst = rng() < 0.5;
  return {
    erste: mitZuerst ? "mit_skill" : "ohne_skill",
    zweite: mitZuerst ? "ohne_skill" : "mit_skill",
    randomisiert: true,
  };
}
