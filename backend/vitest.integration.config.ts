import { defineConfig } from "vitest/config";

// Integration suite: requires a live Postgres (see docker-compose.yml) and
// TEST_DATABASE_URL / TEST_DATABASE_URL_APP_ROLE / TEST_DATABASE_URL_BLINDVOTING_ROLE
// pointing at it. Verifies the DB-permission acceptance criterion from the
// briefing (content_ref table unreachable via the normal backend role).
export default defineConfig({
  test: {
    include: ["test/integration/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
