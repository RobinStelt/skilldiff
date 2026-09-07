import { describe, expect, it } from "vitest";
import { resolveBackendUrl } from "../src/api/backendUrl.js";

describe("local backend cookie origin", () => {
  it("uses the preview hostname for local API cookies", () => {
    expect(resolveBackendUrl("http://localhost:3000", "127.0.0.1")).toBe("http://127.0.0.1:3000/");
    expect(resolveBackendUrl("http://127.0.0.1:3000", "localhost")).toBe("http://localhost:3000/");
  });
  it("preserves configured remote API destinations", () => {
    expect(resolveBackendUrl("https://api.example.com", "127.0.0.1")).toBe("https://api.example.com/");
    expect(resolveBackendUrl("http://localhost:3000", "example.com")).toBe("http://localhost:3000/");
  });
});
