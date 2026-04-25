/**
 * One-shot content polish for the MOSE Giftcard product.
 *
 * - Sets a clean, bilingual name + description so /nl/ and /en/ both
 *   read perfectly on mobile and desktop.
 * - Removes the bullet list from the description (the perks row in
 *   `GiftCardProductView` already covers delivery / sale / validity).
 * - Clears `meta_description` so each locale's metadata generator
 *   falls back to its own localized description; keeps `meta_title`
 *   brand-only so it works in both locales.
 *
 * Run with: `npx tsx scripts/polish-giftcard-content.ts`
 */
import 'dotenv/config'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

const updates = {
  name: 'MOSE Giftcard',
  name_en: 'MOSE Gift Card',
  description: [
    'Even geen inspiratie voor (alweer) een cadeau? Met de MOSE Giftcard zit je altijd goed.',
    '',
    'Laat hem of haar zelf het favoriete piece kiezen uit de collectie — premium basics, gemaakt in Groningen, gedragen met intentie.',
  ].join('\n'),
  description_en: [
    "Stuck for gift ideas — again? The MOSE Gift Card never misses.",
    '',
    'Let them pick their own favourite from the collection — premium basics, made in Groningen, worn with intention.',
  ].join('\n'),
  meta_title: 'MOSE Giftcard',
  // Cleared on purpose: the metadata generator falls back to the
  // localized description per locale, so EN visitors get an EN snippet
  // instead of inheriting the Dutch one.
  meta_description: null as string | null,
  updated_at: new Date().toISOString(),
}

async function main() {
  const { data: before, error: readErr } = await supabase
    .from('products')
    .select('id, slug, name, name_en, description, description_en, meta_title, meta_description')
    .eq('slug', 'mose-giftcard')
    .single()

  if (readErr || !before) {
    console.error('Could not load giftcard product:', readErr)
    process.exit(1)
  }

  console.log('--- BEFORE ---')
  console.log(JSON.stringify(before, null, 2))

  const { data: after, error: updErr } = await supabase
    .from('products')
    .update(updates)
    .eq('slug', 'mose-giftcard')
    .select('id, slug, name, name_en, description, description_en, meta_title, meta_description')
    .single()

  if (updErr || !after) {
    console.error('Update failed:', updErr)
    process.exit(1)
  }

  console.log('\n--- AFTER ---')
  console.log(JSON.stringify(after, null, 2))
  console.log('\n✓ Giftcard content polished.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
