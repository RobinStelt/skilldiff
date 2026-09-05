-- Admin login + catalog metadata (github link, license, maintainer, ...).
-- Deliberately a completely separate concept from `accounts` (pseudonymous
-- skill-testers, briefing 04) — admins curate the catalog, they never
-- author or influence run data. No admin field here ever feeds into
-- aggregation (src/aggregation/*) or the reputation weight — catalog
-- metadata is purely descriptive/display, checked structurally by keeping
-- it in its own table with its own, separate roles below.

CREATE TABLE IF NOT EXISTS admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text UNIQUE NOT NULL,
  -- scrypt hash, see backend/src/admin/passwords.ts — no plaintext, ever.
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Server-side sessions (not a stateless JWT) — a compromised or
-- no-longer-wanted session can be revoked by deleting the row, not just
-- "expired eventually". Only the hash of the token is stored, same
-- reasoning as a password: the raw token in the cookie is the only thing
-- that authenticates, so the stored side must not be usable on its own.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash    text PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions (expires_at);

-- Catalog metadata for a skill_id. Row may not exist yet for a skill that
-- already has run_results (uncatalogued skills are still fully functional
-- in aggregation/export — this table is additive, display-only).
CREATE TABLE IF NOT EXISTS skill_metadata (
  skill_id           text PRIMARY KEY,
  name               text NOT NULL,
  description        text,
  github_url         text,
  license            text,
  maintainer         text,
  -- Catalog/browse category shown in listings — explicitly NOT the same
  -- field as run_results.category (auto-detected per run, drives
  -- aggregation, briefing 04 point 3). An admin can call a skill
  -- "marketing" here for browsing while its actual measured runs land in
  -- whatever category detectCategory() infers per task — the two are
  -- never merged or cross-referenced in any aggregation query.
  declared_category  text,
  github_stars       integer,
  github_stars_fetched_at timestamptz,
  created_by         uuid REFERENCES admin_users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- --- Roles & grants -----------------------------------------------------
-- app_backend needs full CRUD here (unlike run_results, which the CLI
-- ingestion path owns) — admin endpoints run through the same pool as the
-- rest of the public API.
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_users TO app_backend;
GRANT SELECT, INSERT, DELETE ON admin_sessions TO app_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON skill_metadata TO app_backend;
