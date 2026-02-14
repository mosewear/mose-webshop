const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.production.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const MAX_TITLE_LENGTH = 60

function normalizeWhitespace(value) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function categoryKeyword(categoryName, productName) {
  const value = `${normalizeWhitespace(categoryName)} ${normalizeWhitespace(productName)}`.toLowerCase()

  if (value.includes('tee') || value.includes('t-shirt') || value.includes('shirt')) {
    return 't-shirt heren'
  }
  if (value.includes('hoodie')) {
    return 'hoodie heren'
  }
  if (value.includes('sweater') || value.includes('trui')) {
    return 'sweater heren'
  }
  if (value.includes('jacket') || value.includes('jas')) {
    return 'jas heren'
  }
  if (value.includes('broek') || value.includes('pants')) {
    return 'broek heren'
  }
  if (value.includes('horloge') || value.includes('watch')) {
    return 'automatisch herenhorloge'
  }
  return 'premium herenkleding'
}

function trimTitle(value) {
  if (value.length <= MAX_TITLE_LENGTH) return value
  return `${value.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
}

function buildMetaTitle(product) {
  const name = normalizeWhitespace(product.name)
  const categoryName = normalizeWhitespace(product.categories?.name || '')
  const keyword = categoryKeyword(categoryName, name)

  const variants = [
    `${name} - ${keyword} | MOSE`,
    `${name} | ${keyword} | MOSE`,
    `${name} | premium kwaliteit | MOSE`,
    `${name} | MOSE`,
  ]

  for (const variant of variants) {
    if (variant.length <= MAX_TITLE_LENGTH) {
      return variant
    }
  }

  return trimTitle(`${name} | MOSE`)
}

async function run() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, meta_title, is_active, categories(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch products:', error.message)
    process.exit(1)
  }

  if (!products || products.length === 0) {
    console.log('No active products found.')
    return
  }

  let updated = 0

  for (const product of products) {
    const newTitle = buildMetaTitle(product)
    const currentTitle = normalizeWhitespace(product.meta_title)

    if (currentTitle === newTitle) {
      continue
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ meta_title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', product.id)

    if (updateError) {
      console.error(`Failed to update "${product.name}" (${product.slug}):`, updateError.message)
      continue
    }

    updated += 1
    console.log(`Updated: ${product.slug} -> ${newTitle}`)
  }

  console.log(`Done. Updated ${updated} of ${products.length} active products.`)
}

run().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})

