// @vitest-environment node
import { it } from 'vitest'

// Exercise the real isolated PostgreSQL migration assertions in ordinary npm
// test/CI. No external workspace, credentials or production database is needed.
it('verifies native gift amount registry fencing, capacity and privileges', async () => {
  await import('./shopify-native-gift-catalog-migration-check.mjs')
}, 15_000)
