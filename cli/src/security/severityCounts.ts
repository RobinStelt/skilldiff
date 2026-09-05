import type { SeverityCounts } from "@marktplatz/schema";

export function leereSeverityCounts(): SeverityCounts {
  return { kritisch: 0, hoch: 0, mittel: 0, niedrig: 0 };
}

export function addiereSeverityCounts(a: SeverityCounts, b: SeverityCounts): SeverityCounts {
  return {
    kritisch: a.kritisch + b.kritisch,
    hoch: a.hoch + b.hoch,
    mittel: a.mittel + b.mittel,
    niedrig: a.niedrig + b.niedrig,
  };
}
