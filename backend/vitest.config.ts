import { defineConfig } from "vitest/config";

// Unit tests only — no live database required. See vitest.integration.config.ts
// for the suite that talks to a real Postgres instance (docker-compose.yml).
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/integration/**"],
  },
});
