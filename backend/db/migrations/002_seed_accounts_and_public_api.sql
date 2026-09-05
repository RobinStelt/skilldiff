-- Closes the gap between the Phase 3 backend and the Phase 4 frontend's
-- documented API contract (frontend/README.md, section "Backend gap") —
-- done now, before Phase 5 (Vorbefüllung), because Phase 5's acceptance
-- criterion "Frontend zeigt sichtbar 'Startdaten' an" can't be met without
-- it, and Phase 5 explicitly forbids touching backend/frontend itself.

-- Briefing 06 point 4: "Der für diese Läufe verwendete account_id wird im
-- Backend als 'bekannter Startdaten-Account' markiert (eigenes Flag, kein
-- Missbrauch des bestehenden Reputationssystems)". Deliberately separate
-- from `flagged` (anomaly system, briefing 04 point 5) and from the
-- reputation weight itself — seed data is trusted, just clearly labeled.
-- app_backend already has table-level SELECT on accounts (001_init.sql),
-- which covers the new column too — no extra grant needed.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_seed_account boolean NOT NULL DEFAULT false;
