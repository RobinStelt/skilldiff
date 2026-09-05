-- Phase 3 initial schema (briefing 04-marktplatz-phase3-backend.md, section 4/7
-- of skill-ab-marktplatz-plan.md).
--
-- Access-control design (acceptance criterion: "Zugriff auf die content_ref-
-- Tabelle ist über einen normalen Backend-DB-User nachweislich nicht
-- möglich"):
--   - app_backend      general backend role. Reads/writes accounts and
--                       run_results. Gets NO grant at all on
--                       run_result_content — Postgres denies access to a
--                       table by default unless explicitly granted, so this
--                       is a structural guarantee, not an app-level check.
--   - content_writer    used ONLY by the ingestion persistence path
--                       (src/ingestion/persist.ts), via its own pooled
--                       connection with separate credentials. INSERT-only on
--                       run_result_content, no SELECT (write-then-forget —
--                       the backend never reads plaintext content back).
--   - blindvoting_service  future Phase-7 consumer. SELECT-only on
--                       run_result_content. Not used anywhere yet in Phase 3.
--
-- Run via `npm run migrate` (scripts/migrate.ts), idempotent.

CREATE TABLE IF NOT EXISTS accounts (
  account_id      text PRIMARY KEY,
  -- HMAC signing secret, sent once by the CLI via POST /v1/accounts (see
  -- src/accounts/accountStore.ts for why this can't be trust-on-first-use
  -- from an upload, and src/canonical.ts for a caveat about what the
  -- current CLI signature actually covers). Never exposed via any read API.
  signing_secret  text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  upload_count    integer NOT NULL DEFAULT 0,
  -- Set by the anomaly job (src/anomaly). Lowers reputation weight, never
  -- deletes or hides the account's data (briefing point 5).
  flagged         boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS run_results (
  run_id            text PRIMARY KEY,
  account_id        text NOT NULL REFERENCES accounts(account_id),
  skill_id          text NOT NULL,
  category          text NOT NULL,
  size_bucket       text NOT NULL,
  isolation_tier    text NOT NULL,
  order_randomized  boolean NOT NULL,
  run_timestamp     timestamptz NOT NULL,
  claude_version    text NOT NULL,
  cli_version       text NOT NULL,
  cli_build_hash    text NOT NULL,
  content_opt_in    boolean NOT NULL,
  -- Whether content_ref was set — NOT the plaintext content itself, which
  -- lives exclusively in run_result_content (briefing point 2).
  has_content_ref   boolean NOT NULL,
  with_skill        jsonb NOT NULL,
  without_skill     jsonb NOT NULL,
  security_delta    jsonb,
  category_metrics  jsonb,
  -- Reputation x isolation-tier x build-hash weight, computed at ingestion
  -- time (briefing point 4) and recomputed as account history/flags change.
  weight            numeric NOT NULL,
  anomaly_flags     text[] NOT NULL DEFAULT '{}',
  received_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS run_results_skill_category_idx
  ON run_results (skill_id, category);
CREATE INDEX IF NOT EXISTS run_results_account_skill_idx
  ON run_results (account_id, skill_id);

-- Separate table, separate rights (briefing point 2 / plan section 4).
CREATE TABLE IF NOT EXISTS run_result_content (
  run_id      text PRIMARY KEY REFERENCES run_results(run_id),
  content_ref text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- --- Roles & grants -----------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_backend') THEN
    CREATE ROLE app_backend LOGIN PASSWORD 'change-me-app-backend';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'content_writer') THEN
    CREATE ROLE content_writer LOGIN PASSWORD 'change-me-content-writer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'blindvoting_service') THEN
    CREATE ROLE blindvoting_service LOGIN PASSWORD 'change-me-blindvoting';
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE ON accounts TO app_backend;
GRANT SELECT, INSERT, UPDATE ON run_results TO app_backend;
-- Deliberately NO grant of any kind on run_result_content to app_backend.

GRANT INSERT ON run_result_content TO content_writer;
-- content_writer needs to know the account_id is legitimate to satisfy the
-- FK-adjacent run_id reference, but never reads content back.
GRANT SELECT (run_id) ON run_results TO content_writer;

GRANT SELECT ON run_result_content TO blindvoting_service;
