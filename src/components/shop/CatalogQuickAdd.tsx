'use client'

import {useEffect, useId, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import Image from 'next/image'
import {X} from 'lucide-react'
import {useLocale, useTranslations} from 'next-intl'
import {Link} from '@/i18n/routing'
import {createClient} from '@/lib/supabase/client'
import {SHOP_PRODUCT_SELECT} from '@/lib/catalog-select'
import {type CatalogProduct, variantPrice} from '@/lib/catalog-filters'
import {availableVariant, isMadeToOrderAvailable, variantQuantityLimit} from '@/lib/variant-availability'
import {buildPdpHref, formatColorLabel, getImageForColor, getUniqueColors} from '@/lib/product-display'
import {formatPrice} from '@/lib/format-price'
import {compareSizes} from '@/lib/variant-sort'
import {useCart} from '@/store/cart'
import {useCartDrawer} from '@/store/cartDrawer'
import {trackAddToCart} from '@/lib/analytics'

/** Mounted on demand; current published variants are read again before adding. */
export default function CatalogQuickAdd({product, initialColor, onClose}: {
  product: CatalogProduct
  initialColor?: string | null
  onClose: () => void
}) {
  const t = useTranslations('shop.catalog.quick'), locale = useLocale(), titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null), alive = useRef(true), submitting = useRef(false)
  const [current, setCurrent] = useState<CatalogProduct | null>(null)
  const [color, setColor] = useState(initialColor ?? getUniqueColors(product.variants)[0]?.color ?? '')
  const [size, setSize] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const readProduct = async () => {
    const {data, error} = await createClient().from('products').select(SHOP_PRODUCT_SELECT)
      .eq('id', product.id).eq('is_active', true).eq('status', 'active').single()
    if (error || !data || data.is_gift_card) throw new Error('unavailable')
    return data as CatalogProduct
  }
  useEffect(() => {
    alive.current = true
    const trigger = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    return () => {
      alive.current = false
      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [])
  useEffect(() => {
    let stopped = false
    void readProduct().then(data => {
      if (stopped) return
      setCurrent(data)
      const choices = getUniqueColors(data.variants)
      setColor(previous => choices.some(c => c.color === previous) ? previous : choices[0]?.color ?? '')
      setError('')
    }).catch(() => { if (!stopped) setError(t('loadError')) })
    return () => {stopped = true}
    // Re-read only when this mounted product changes or the visitor retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, revision])
  const p = current ?? product, name = locale === 'en' ? p.name_en || p.name : p.name
  const colors = getUniqueColors(p.variants), variants = (p.variants ?? []).filter(v => v.color === color).sort((a,b) => compareSizes(a.size ?? '', b.size ?? ''))
  const selected = variants.find(v => v.size === size)
  const add = async () => {
    if (!current || !selected?.id || !availableVariant(selected) || submitting.current) return
    submitting.current = true
    setBusy(true); setError('')
    try {
      const fresh = await readProduct()
      if (!alive.current) return
      setCurrent(fresh)
      const v = fresh.variants?.find(v => v.id === selected.id && v.color === color && v.size === size)
      if (!v?.id || !availableVariant(v)) { setError(t('soldOut')); return }
      const price = variantPrice(fresh, v)
      if (price !== variantPrice(current, selected)) {setError(t('priceChanged')); return}
      const store = useCart.getState(), existing = store.items.find(item => item.variantId === v.id)?.quantity ?? 0
      if (existing >= variantQuantityLimit(v)) {setError(t('quantityLimit')); return}
      const madeToOrder = isMadeToOrderAvailable(v)
      store.addItem({productId: fresh.id, variantId: v.id, slug: fresh.slug, name: fresh.name,
        size: v.size ?? '', color: v.color ?? '', colorHex: v.color_hex ?? '#000000', price, quantity: 1,
        image: getImageForColor(fresh.images, v.color), sku: v.sku ?? '', stock: v.stock_quantity ?? 0,
        isMadeToOrder: madeToOrder,
        isPresale: !madeToOrder && (v.stock_quantity ?? 0) <= 0 && v.presale_enabled === true,
        presaleExpectedDate: v.presale_expected_date ?? undefined, presaleStock: v.presale_stock_quantity ?? 0})
      // Cart success must not depend on optional analytics.
      try {trackAddToCart({id: fresh.id, name: fresh.name, category: fresh.category?.name ?? 'uncategorized', price, quantity: 1,
        color: v.color, size: v.size, variantId: v.id, sku: v.sku, source: 'catalog', sizeChosenByUser: true})} catch { /* Optional measurement. */ }
      onClose()
      useCartDrawer.getState().openDrawer()
    } catch { if (alive.current) setError(t('loadError')) }
    finally {submitting.current = false; if (alive.current) setBusy(false)}
  }
  return createPortal(<dialog ref={dialog} aria-labelledby={titleId} onCancel={onClose} onClose={onClose}
    onClick={event => {if (event.target === event.currentTarget) onClose()}}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]')).filter(el => el.getClientRects().length)
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus()}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus()}
    }}
    className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto border border-black bg-white p-0 text-black backdrop:bg-black/60 sm:inset-0 sm:m-auto sm:w-[440px] sm:max-w-[calc(100%_-_32px)]">
    <div className="p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div><p className="mb-1 text-xs uppercase tracking-wide text-gray-600">{t('title')}</p><h2 id={titleId} className="font-display text-2xl uppercase">{name}</h2></div>
        <button type="button" aria-label={t('close')} onClick={onClose} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center focus-visible:outline-brand-primary"><X size={22}/></button>
      </div>
      <div className="mb-4 flex items-center gap-4">
        <div className="relative h-28 w-20 shrink-0 bg-gray-100"><Image src={getImageForColor(p.images, color)} alt={`${name}, ${formatColorLabel(color, locale)}`} fill sizes="80px" className="object-cover"/></div>
        <div><p className="font-bold">{formatPrice(variantPrice(p, selected ?? variants[0]), locale)}</p><Link href={buildPdpHref(p.slug, color)} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">{t('details')}</Link></div>
      </div>
      {!current && !error && <p role="status" className="py-4 text-sm">{t('loading')}</p>}
      {current && <>
        <fieldset className="mb-4"><legend className="text-sm font-semibold">{t('color')}: {formatColorLabel(color, locale)}</legend><div className="flex flex-wrap gap-1">{colors.map(c => <button key={c.color} type="button" aria-label={formatColorLabel(c.color, locale)} aria-pressed={c.color === color} disabled={busy}
          onClick={() => {setColor(c.color); setSize(''); setError('')}} className="flex h-11 w-11 items-center justify-center focus-visible:outline-brand-primary">
          <span className={`h-5 w-5 border border-black ${c.color === color ? 'outline outline-1 outline-offset-4 outline-black' : ''}`} style={{backgroundColor: c.color_hex ?? '#000'}}/>
        </button>)}</div></fieldset>
        <fieldset className="mb-5"><legend className="mb-2 text-sm font-semibold">{t('size')}</legend><div className="flex flex-wrap gap-2">{variants.map(v => <button key={v.id ?? v.size} type="button" disabled={busy || !availableVariant(v)} aria-pressed={size === v.size}
          aria-label={`${v.size}${!availableVariant(v) ? ` — ${t('soldOut')}` : ''}`} onClick={() => {setSize(v.size ?? ''); setError('')}}
          className={`min-h-11 min-w-12 border px-3 text-sm font-bold focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:text-gray-400 disabled:line-through ${size === v.size ? 'border-black bg-black text-white' : 'border-gray-300 bg-white hover:border-black'}`}>{v.size}</button>)}</div></fieldset>
      </>}
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      {!current && error ? <button type="button" onClick={() => {setError(''); setRevision(n => n+1)}} className="min-h-12 w-full border border-black p-3 font-bold">{t('retry')}</button> :
        <button type="button" onClick={() => void add()} disabled={!current || !selected || !availableVariant(selected) || busy} className="mose-button mose-button--secondary w-full disabled:bg-gray-200 disabled:text-gray-500">{busy ? t('checking') : size ? t('add') : t('chooseSize')}</button>}
    </div>
  </dialog>, document.body)
}
