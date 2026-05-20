-- Phase 0: idempotent execution log.
--
-- One row per attempted action against the Meta API. Captures every step:
-- guardrail outcome (allowed / blocked + reason), the executed payload, the
-- Meta API response, and any error. Rollback information is preserved so the
-- admin UI can offer a 30-day undo per the plan's liability terms.

CREATE TABLE IF NOT EXISTS ad_autopilot_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES ad_autopilot_decisions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'pause_ad_set',
    'resume_ad_set',
    'pause_ad',
    'resume_ad',
    'update_ad_set_budget',
    'update_campaign_budget',
    'exclude_audience',
    'create_custom_audience',
    'create_lookalike_audience',
    'launch_creative_variant',
    'pause_oos_ad_set',
    'no_op'
  )),
  target_level TEXT NOT NULL CHECK (target_level IN ('account', 'campaign', 'ad_set', 'ad', 'audience', 'creative')),
  target_meta_id TEXT NOT NULL,
  target_label TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  prior_state JSONB,
  guardrail_outcome TEXT NOT NULL CHECK (guardrail_outcome IN ('allowed', 'blocked', 'killswitch', 'manual_override')),
  guardrail_reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'executed', 'failed', 'reverted', 'skipped')),
  meta_api_request_id TEXT,
  meta_api_response JSONB,
  error_message TEXT,
  executed_at TIMESTAMPTZ,
  reverted_at TIMESTAMPTZ,
  reverted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ad_autopilot_actions IS 'Idempotent execution log: every Meta API mutation attempted by the autopilot, with guardrail outcome and rollback metadata.';
COMMENT ON COLUMN ad_autopilot_actions.prior_state IS 'Pre-mutation snapshot of the affected entity (budget, status, etc) so a 30-day rollback can restore.';
COMMENT ON COLUMN ad_autopilot_actions.guardrail_outcome IS 'allowed = passed all guardrails; blocked = guardrail rejected; killswitch = autopilot disabled; manual_override = admin forced execution.';

CREATE INDEX IF NOT EXISTS idx_ad_autopilot_actions_decision ON ad_autopilot_actions(decision_id);
CREATE INDEX IF NOT EXISTS idx_ad_autopilot_actions_target ON ad_autopilot_actions(target_meta_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_autopilot_actions_status ON ad_autopilot_actions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_autopilot_actions_executed ON ad_autopilot_actions(executed_at DESC) WHERE executed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_autopilot_actions_revertable ON ad_autopilot_actions(executed_at DESC)
  WHERE status = 'executed' AND reverted_at IS NULL;

ALTER TABLE ad_autopilot_actions ENABLE ROW LEVEL SECURITY;

-- Admins can read all actions and update only the revert fields.
-- Service role writes new rows during execution.
CREATE POLICY "Admins read autopilot actions" ON ad_autopilot_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can revert actions" ON ad_autopilot_actions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_admin = true
            AND COALESCE(admin_role, 'admin') IN ('admin', 'manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_admin = true
            AND COALESCE(admin_role, 'admin') IN ('admin', 'manager'))
  );
