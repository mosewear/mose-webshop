/**
 * Smoke test: run the autopilot orchestrator end-to-end against the
 * production Supabase (read + write to ad_autopilot_decisions /
 * ad_autopilot_actions) using the deterministic mock provider so we
 * don't burn OpenAI tokens.
 *
 * Usage:
 *   npx tsx scripts/smoke-test-orchestrator.ts
 *
 * Loads .env.local automatically.
 */
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

import { runAutopilotDailyDecision } from '../src/lib/ai/orchestrator'

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars; load .env.local first.')
    process.exit(1)
  }

  console.log('[smoke] running orchestrator with mock provider')
  const result = await runAutopilotDailyDecision({
    trigger: 'manual',
    provider: 'mock',
    model: 'gpt-4o-mini',
  })
  console.log('[smoke] result:', JSON.stringify(result, null, 2))
}

main().catch((e) => {
  console.error('[smoke] failed:', e)
  process.exit(1)
})
