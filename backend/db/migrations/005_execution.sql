-- Preserve legacy rows; unknown models must remain identifiable as unknown.
ALTER TABLE run_results ALTER COLUMN claude_version DROP NOT NULL;
ALTER TABLE run_results ADD COLUMN IF NOT EXISTS execution jsonb NOT NULL
  DEFAULT '{"agent":"claude","model":"unknown","agent_version":"unknown","reasoning_effort":null}'::jsonb;
CREATE INDEX IF NOT EXISTS run_results_execution_idx
  ON run_results ((execution->>'agent'), (execution->>'model'), skill_id, category);
