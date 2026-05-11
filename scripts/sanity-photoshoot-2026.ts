/**
 * Quick sanity-check: print key DB rows that should reference the
 * photoshoot-2026 v2 imagery so we can eyeball that everything is
 * pointed at the right URLs.
 *
 * Run with:  npx tsx scripts/sanity-photoshoot-2026.ts
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const sb = createClient(url, key, { auth: { persistSession: false } })

function short(u?: string | null): string {
  if (!u) return '<null>'
  return u.includes('photoshoot-2026') ? '✓ ' + u.split('/photoshoot-2026/')[1] : '✗ ' + u
}

async function main() {
  const { data: hp } = await sb.from('homepage_settings').select('hero_image_url, hero_image_url_mobile, story_image_url').limit(1).single()
  console.log('\n[homepage_settings]')
  console.log('  hero desktop  :', short(hp?.hero_image_url))
  console.log('  hero mobile   :', short(hp?.hero_image_url_mobile))
  console.log('  story         :', short(hp?.story_image_url))

  const { data: about } = await sb.from('about_settings').select('hero_image_url, hero_image_url_mobile, image_focal_x, image_focal_y, hero_alt_nl').limit(1).single()
  console.log('\n[about_settings]')
  console.log('  hero desktop  :', short(about?.hero_image_url))
  console.log('  hero mobile   :', short(about?.hero_image_url_mobile))
  console.log('  focal         :', `${about?.image_focal_x}, ${about?.image_focal_y}`)
  console.log('  alt nl        :', about?.hero_alt_nl)

  const { data: cats } = await sb.from('categories').select('slug, image_url').in('slug', ['hoodies', 'sweaters', 't-shirts'])
  console.log('\n[categories]')
  for (const c of cats ?? []) console.log(`  ${c.slug.padEnd(12)}:`, short(c.image_url))

  const { data: chapters } = await sb.from('lookbook_chapters').select('title_nl, sort_order, hero_image_url').order('sort_order')
  console.log('\n[lookbook_chapters]')
  for (const c of chapters ?? []) console.log(`  ${String(c.sort_order).padStart(2)} ${String(c.title_nl).padEnd(28)}:`, short(c.hero_image_url))

  const products = ['mose-essential-hoodie', 'mose-classic-sweater', 'mose-tee']
  console.log('\n[product_images counts per product]')
  for (const slug of products) {
    const { data: p } = await sb.from('products').select('id, name').eq('slug', slug).maybeSingle()
    if (!p) {
      console.log(`  ${slug}: <product not found>`)
      continue
    }
    const { count } = await sb.from('product_images').select('*', { count: 'exact', head: true }).eq('product_id', p.id)
    const { data: primaries } = await sb.from('product_images').select('color, url, is_primary').eq('product_id', p.id).eq('is_primary', true).order('color')
    console.log(`  ${p.name} (${count} images):`)
    for (const pr of primaries ?? []) console.log(`    primary ${(pr.color ?? '<no color>').padEnd(10)}:`, short(pr.url))
  }

  const { data: blogs, error: blogErr } = await sb.from('blog_posts').select('slug, featured_image_url').order('slug')
  if (blogErr) console.log('\n[blog_posts] error:', blogErr.message)
  else {
    console.log('\n[blog_posts]')
    for (const b of blogs ?? []) console.log(`  ${b.slug.padEnd(60)}:`, short(b.featured_image_url))
  }
}

main().catch((e) => { console.error('✗', e); process.exit(1) })
