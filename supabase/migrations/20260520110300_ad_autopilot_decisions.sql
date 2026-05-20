-- Phase 0: full audit trail of every LLM-generated decision.
--
-- Each row is one invocation of the optimizer: the input snapshot reference,
-- the prompt version + hash for reproducibility, the raw LLM response, and
-- the parsed/structured action proposals before guardrails are applied.
-- Actual execution is logged separately in ad_autopilot_actions.

CREATE TABLE IF NOT EXISTS ad_autopilot_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_completed_at TIMESTAMPTZ,
  trigger TEXT NOT NULL DEFAULT 'cron' CHECK (trigger IN ('cron', 'manual', 'webhook', 'backfill')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  snapshot_date DATE,
  input_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  llm_raw_response JSONB,
  parsed_actions JSONB NOT NULL DEFAULT '[]'::JSONB,
  proposal_count INT NOT NULL DEFAULT 0,
  cost_input_tokens INT,
  cost_output_tokens INT,
  cost_usd NUMERIC(10, 6),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed', 'killswitch')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ad_autopilot_decisions IS 'Audit trail of every LLM decision run. Stores prompt version + hash for reproducibility, parsed action proposals before guardrails.';
COMMENT ON COLUMN ad_autopilot_decisions.prompt_version IS 'Semver-style prompt template version, e.g. v1-daily-audit.md@1.2.0.';
COMMENT ON COLUMN ad_autopilot_decisions.prompt_hash IS 'SHA-256 of the fully-rendered prompt (system + user) so identical inputs are detectable.';
COMMENT ON COLUMN ad_autopilot_decisions.parsed_actions IS 'JSON array of structured action proposals (typed via Zod in the orchestrator), before guardrails decide which run.';

CREATE INDEX IF NOT EXISTS idx_ad_autopilot_decisions_started ON ad_autopilot_decisions(run_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_autopilot_decisions_status ON ad_autopilot_decisions(status, run_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_autopilot_decisions_snapshot ON ad_autopilot_decisions(snapshot_date) WHERE snapshot_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_autopilot_decisions_prompt ON ad_autopilot_decisions(prompt_version, run_started_at DESC);

ALTER TABLE ad_autopilot_decisions ENABLE ROW LEVEL SECURITY;

-- Read-only for any admin role so viewers can audit but not tamper.
CREATE POLICY "Admins read autopilot decisions" ON ad_autopilot_decisions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
