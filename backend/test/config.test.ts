import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { createPools } from "../src/db/pools.js";

describe("loadConfig", () => {
  it("throws when APP_DATABASE_URL is missing", () => {
    expect(() => loadConfig({})).toThrow(/APP_DATABASE_URL/);
  });

  it("does NOT require CONTENT_WRITER_DATABASE_URL — real bug: every one-off admin script (create-admin.ts etc.) only ever uses appDatabaseUrl", () => {
    const config = loadConfig({ APP_DATABASE_URL: "postgres://app" });
    expect(config.appDatabaseUrl).toBe("postgres://app");
    expect(config.contentWriterDatabaseUrl).toBeUndefined();
  });
});

describe("createPools", () => {
  it("throws a clear error when CONTENT_WRITER_DATABASE_URL is missing — this is the real consumer that needs it, not loadConfig", () => {
    const config = loadConfig({ APP_DATABASE_URL: "postgres://app" });
    expect(() => createPools(config)).toThrow(/CONTENT_WRITER_DATABASE_URL/);
  });
});
