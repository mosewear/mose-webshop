import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { authorized } = await requireAdmin()
    if (!authorized) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const { productId } = await request.json()
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is verplicht' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 })
    }

    const { data: variants } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)

    const { id, created_at, updated_at, ...productFields } = product
    const now = new Date().toISOString()
    const baseSlug = product.slug.replace(/-kopie(-\d+)?$/, '')
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .like('slug', `${baseSlug}-kopie%`)

    const slugSuffix = count && count > 0 ? `-${count + 1}` : ''

    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert({
        ...productFields,
        name: `Kopie van ${product.name}`,
        slug: `${baseSlug}-kopie${slugSuffix}`,
        is_active: false,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (insertError || !newProduct) {
      return NextResponse.json(
        { error: `Fout bij dupliceren: ${insertError?.message}` },
        { status: 500 }
      )
    }

    if (variants && variants.length > 0) {
      const newVariants = variants.map((v) => {
        const { id, created_at, updated_at, product_id, ...variantFields } = v
        return {
          ...variantFields,
          product_id: newProduct.id,
          created_at: now,
          updated_at: now,
        }
      })

      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(newVariants)

      if (variantsError) {
        console.error('Variant copy failed:', variantsError)
      }
    }

    return NextResponse.json({ id: newProduct.id })
  } catch (err: any) {
    console.error('Duplicate error:', err)
    return NextResponse.json(
      { error: err.message || 'Interne serverfout' },
      { status: 500 }
    )
  }
}
