import { describe, expect, it } from "vitest";
import { randomisiereReihenfolge } from "../src/orchestration/randomize.js";

describe("randomisiereReihenfolge", () => {
  it("liefert mit_skill zuerst, wenn rng < 0.5", () => {
    const r = randomisiereReihenfolge(() => 0.1);
    expect(r.erste).toBe("mit_skill");
    expect(r.zweite).toBe("ohne_skill");
    expect(r.randomisiert).toBe(true);
  });

  it("liefert ohne_skill zuerst, wenn rng >= 0.5", () => {
    const r = randomisiereReihenfolge(() => 0.9);
    expect(r.erste).toBe("ohne_skill");
    expect(r.zweite).toBe("mit_skill");
  });

  it("liefert bei vielen Durchläufen beide Bedingungen als erste (kein Bias durch Implementierungsfehler)", () => {
    const ergebnisse = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ergebnisse.add(randomisiereReihenfolge(Math.random).erste);
    }
    expect(ergebnisse.has("mit_skill")).toBe(true);
    expect(ergebnisse.has("ohne_skill")).toBe(true);
  });
});
