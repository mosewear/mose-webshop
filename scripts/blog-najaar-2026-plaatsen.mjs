/**
 * Plaatst de artikelen uit blog-najaar-2026.mjs in de database.
 *
 * Idempotent: bestaat de slug al, dan wordt het artikel bijgewerkt in plaats
 * van verdubbeld. Zo kun je een tekst aanpassen en opnieuw draaien.
 *
 * Draaien met:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/blog-najaar-2026-plaatsen.mjs
 */

import { artikelen } from './blog-najaar-2026.mjs'

const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN env var required')
  process.exit(1)
}

const PROJECT = 'bsklcgeyvdsxjxvmghbp'
const BASIS =
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/photoshoot-2026/'
const HORLOGE =
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/products/07dbf6e8-230c-4799-b739-ff4c423ca603/zilver/1767806522592-t7c8rr.jpeg'

const sql = (q) =>
  fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  }).then(async (r) => {
    const tekst = await r.text()
    if (!r.ok) throw new Error(`${r.status} ${tekst}`)
    return JSON.parse(tekst)
  })

/** Tekst veilig in een SQL-literal. */
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const arr = (v) => `ARRAY[${v.map(q).join(',')}]::text[]`

const beeldVan = (b) => (b === 'horloge' ? HORLOGE : BASIS + b)

for (const a of artikelen) {
  const seoNl = `${a.title_nl} | MOSE`
  const seoEn = `${a.title_en} | MOSE`

  await sql(`
    insert into blog_posts (
      slug, title_nl, title_en, content_nl, content_en, excerpt_nl, excerpt_en,
      featured_image_url, category, tags, status, author, reading_time,
      seo_title_nl, seo_title_en, seo_description_nl, seo_description_en,
      published_at, created_at, updated_at
    ) values (
      ${q(a.slug)}, ${q(a.title_nl)}, ${q(a.title_en)}, ${q(a.content_nl)}, ${q(a.content_en)},
      ${q(a.excerpt_nl)}, ${q(a.excerpt_en)}, ${q(beeldVan(a.beeld))}, ${q(a.category)},
      ${arr(a.tags)}, 'published', 'MOSE', ${a.reading_time},
      ${q(seoNl)}, ${q(seoEn)}, ${q(a.excerpt_nl)}, ${q(a.excerpt_en)},
      ${q(a.datum + ' 08:00:00+00')}, ${q(a.datum + ' 08:00:00+00')}, now()
    )
    on conflict (slug) do update set
      title_nl = excluded.title_nl,
      title_en = excluded.title_en,
      content_nl = excluded.content_nl,
      content_en = excluded.content_en,
      excerpt_nl = excluded.excerpt_nl,
      excerpt_en = excluded.excerpt_en,
      featured_image_url = excluded.featured_image_url,
      category = excluded.category,
      tags = excluded.tags,
      status = excluded.status,
      reading_time = excluded.reading_time,
      seo_title_nl = excluded.seo_title_nl,
      seo_title_en = excluded.seo_title_en,
      seo_description_nl = excluded.seo_description_nl,
      seo_description_en = excluded.seo_description_en,
      published_at = excluded.published_at,
      updated_at = now();
  `)
  console.log('✓', a.datum, a.slug)
}

const [{ count }] = await sql(
  "select count(*)::int as count from blog_posts where status = 'published';",
)
console.log(`\nGepubliceerd in totaal: ${count}`)
