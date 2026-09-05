import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/admin/passwords.js";

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("wrong password", hash)).toBe(false);
  });

  it("never stores the password in plaintext", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
  });

  it("produces a different hash each time (random salt)", () => {
    const a = hashPassword("same password");
    const b = hashPassword("same password");
    expect(a).not.toBe(b);
    expect(verifyPassword("same password", a)).toBe(true);
    expect(verifyPassword("same password", b)).toBe(true);
  });

  it("rejects a malformed stored hash instead of throwing", () => {
    expect(verifyPassword("anything", "not-a-valid-hash")).toBe(false);
  });
});
