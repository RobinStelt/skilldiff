import { describe, expect, it } from "vitest";
import { canonicalJson } from "../src/canonicalJson.js";

describe("canonicalJson", () => {
  it("sorts top-level keys", () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it("sorts keys at EVERY nesting level, not just the top one (the bug this replaces)", () => {
    const value = { a: 1, with_skill: { tokens: 5, success: true } };
    expect(canonicalJson(value)).toBe('{"a":1,"with_skill":{"success":true,"tokens":5}}');
    // The old JSON.stringify(value, Object.keys(value).sort()) approach
    // would have produced '{"a":1,"with_skill":{}}' here — nested content
    // silently dropped, not just unsorted.
  });

  it("recurses through arrays of objects too", () => {
    const value = { items: [{ b: 1, a: 2 }, { d: 3, c: 4 }] };
    expect(canonicalJson(value)).toBe('{"items":[{"a":2,"b":1},{"c":4,"d":3}]}');
  });

  it("is deterministic regardless of original key insertion order", () => {
    const a = { x: { z: 1, y: 2 }, w: 3 };
    const b = { w: 3, x: { y: 2, z: 1 } };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it("leaves primitives, null, and empty structures as plain JSON would", () => {
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson(42)).toBe("42");
    expect(canonicalJson("x")).toBe('"x"');
    expect(canonicalJson({})).toBe("{}");
    expect(canonicalJson([])).toBe("[]");
  });

  it("handles a realistic nested RunResult-shaped payload deterministically end to end", () => {
    const value = {
      skill_id: "ponytail",
      with_skill: { success: true, tokens: 100, duration_sec: 5 },
      without_skill: { success: false, tokens: 200, duration_sec: 10 },
      security_delta: {
        with_skill: { critical: 0, high: 1, medium: 0, low: 2 },
        without_skill: { critical: 1, high: 0, medium: 0, low: 0 },
      },
      category_metrics: null,
    };
    const canonical = canonicalJson(value);
    // Every nested field must actually survive — not collapse to {}.
    expect(canonical).toContain('"tokens":100');
    expect(canonical).toContain('"tokens":200');
    expect(canonical).toContain('"high":1');
    expect(canonical).toContain('"low":2');
  });
});
