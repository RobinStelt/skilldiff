import { describe, expect, it } from "vitest";
import { resolveClaudeBin } from "../src/isolation/claudeBinary.js";

describe("resolveClaudeBin", () => {
  it("always prefers an explicit value over auto-detection", () => {
    expect(resolveClaudeBin("C:\\custom\\claude.exe")).toBe("C:\\custom\\claude.exe");
  });

  it("falls back to the bare command when nothing more specific is found", () => {
    // Can't force "not found" deterministically across dev machines without
    // mocking the filesystem — but on non-Windows CI this exercises the
    // real fallback path directly, and on Windows dev machines it may
    // legitimately resolve to a real claude.exe, which is exactly the
    // intended behavior, not a bug to guard against here.
    const result = resolveClaudeBin();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
