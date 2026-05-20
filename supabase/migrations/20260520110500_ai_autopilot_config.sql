-- Phase 0: autopilot configuration keys in the existing site_settings table.
--
-- Following the established pattern: each setting is a JSON value indexed by
-- a stable key. Defaults are conservative; the admin /guardrails page edits
-- these live. The kill switch (ai_autopilot_enabled = false) is checked on
-- every cron iteration before any action runs.

INSERT INTO site_settings (key, value, description, updated_at)
VALUES
  ('ai_autopilot_enabled', 'false'::JSONB,
   'Kill switch for the AI campaign autopilot. False = no automated actions; advisory proposals may still be logged.',
   now()),
  ('ai_autopilot_mode', '"advisory"'::JSONB,
   'Operating mode: advisory | bounded | full. Advisory = propose only, never execute. Bounded = execute within hard caps. Full = full autonomy (Phase 4+).',
   now()),
  ('ai_autopilot_max_budget_change_pct', '0.10'::JSONB,
   'Maximum fractional budget change per run per ad set (0.10 = ±10%).',
   now()),
  ('ai_autopilot_max_daily_spend_shift_eur', '50'::JSONB,
   'Maximum total euro budget movement (sum of absolute deltas) per 24h window.',
   now()),
  ('ai_autopilot_account_spend_cap_eur', '500'::JSONB,
   'Hard ceiling on combined daily spend across all autopilot-managed campaigns. Exceeding this triggers killswitch.',
   now()),
  ('ai_autopilot_min_margin_pct_floor', '0.15'::JSONB,
   'Below this contribution margin fraction, the autopilot may only decrease spend, never increase.',
   now()),
  ('ai_autopilot_working_hours', '{"start_hour": 7, "end_hour": 22, "timezone": "Europe/Amsterdam"}'::JSONB,
   'Hours during which the autopilot may take actions. Outside this window: advisory only.',
   now()),
  ('ai_autopilot_revert_window_days', '30'::JSONB,
   'Number of days an executed action remains revertable from the admin UI.',
   now())
ON CONFLICT (key) DO NOTHING;
