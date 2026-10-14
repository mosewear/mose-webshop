'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { X, Search as SearchIcon, CornerDownLeft } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { useLocale, useTranslations } from 'next-intl'
import { formatPrice } from '@/lib/format-price'
import { indexeer, zoek, type GeindexeerdProduct, type ZoekProduct } from '@/lib/zoekindex'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

/** Video's zijn geen miniatuur. Dezelfde controle als in de winkelmandlade. */
const isVideoBestand = (url?: string | null) => !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)

/** De catalogus verandert niet tijdens een bezoek, dus één keer ophalen volstaat. */
let catalogusCache: GeindexeerdProduct[] | null = null

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState<GeindexeerdProduct[]>(catalogusCache ?? [])
  const [laden, setLaden] = useState(false)
  const [actief, setActief] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const paneelRef = useRef<HTMLDivElement>(null)
  const lijstRef = useRef<HTMLUListElement>(null)
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('searchOverlay')

  const naamVan = (p: ZoekProduct) => (locale === 'en' && p.name_en ? p.name_en : p.name)
  const categorieVan = (p: ZoekProduct) =>
    locale === 'en' && p.categorie_en ? p.categorie_en : p.categorie

  const resultaten = query.trim() ? zoek(index, query) : []
  // Bij een lege zoekbalk tonen we de catalogus in plaats van een leeg vlak.
  // Een zoekvenster dat niets laat zien tot je typt, is een doodlopend scherm.
  const suggesties = index.slice(0, 4)
  const zichtbaar = query.trim() ? resultaten : suggesties

  // Catalogus ophalen zodra het venster voor het eerst opengaat.
  useEffect(() => {
    if (!isOpen || catalogusCache) return
    let afgebroken = false

    const ophalen = async () => {
      setLaden(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, name_en, slug, base_price, sale_price, category_id,
          product_images (url, is_primary, position),
          product_variants (color, size, is_available),
          categories (name, name_en, slug)
        `)
        // Alleen wat ook echt te koop is. Zonder deze twee filters kon een
        // concept of een uitgezet product in de resultaten komen, met een link
        // naar een pagina die niet bestaat.
        .eq('is_active', true)
        .eq('status', 'active')

      if (afgebroken || error || !data) {
        setLaden(false)
        return
      }

      const slugs: Record<string, string | null> = {}
      const producten: ZoekProduct[] = (data as any[]).map((p) => {
        const categorie = Array.isArray(p.categories) ? p.categories[0] : p.categories
        slugs[p.id] = categorie?.slug ?? null
        const beelden = (p.product_images ?? []).filter((b: any) => !isVideoBestand(b?.url))
        const primair = beelden.find((b: any) => b.is_primary) ?? beelden[0]
        const varianten = (p.product_variants ?? []).filter((v: any) => v.is_available !== false)
        return {
          id: p.id,
          name: p.name,
          name_en: p.name_en ?? null,
          slug: p.slug,
          base_price: Number(p.base_price ?? 0),
          sale_price: p.sale_price != null ? Number(p.sale_price) : null,
          categorie: categorie?.name ?? null,
          categorie_en: categorie?.name_en ?? null,
          afbeelding: primair?.url ?? null,
          kleuren: [...new Set(varianten.map((v: any) => v.color).filter(Boolean))] as string[],
          maten: [...new Set(varianten.map((v: any) => v.size).filter(Boolean))] as string[],
        }
      })

      catalogusCache = indexeer(producten, slugs)
      setIndex(catalogusCache)
      setLaden(false)
    }

    ophalen()
    return () => {
      afgebroken = true
    }
  }, [isOpen])

  // Bij openen: schoon beginnen en de cursor in het veld.
  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setActief(0)
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  useEffect(() => {
    setActief(0)
  }, [query])

  // Pagina erachter op slot, en de focus terug waar hij vandaan kwam.
  useEffect(() => {
    if (!isOpen) return
    const vorigeFocus = document.activeElement as HTMLElement | null
    const vorigeOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = vorigeOverflow
      vorigeFocus?.focus({ preventScroll: true })
    }
  }, [isOpen])

  const open = useCallback(
    (p: ZoekProduct) => {
      onClose()
      router.push(`/product/${p.slug}`)
    },
    [onClose, router],
  )

  // Toetsenbord: pijltjes door de lijst, Enter opent, Tab blijft binnen het
  // venster, Escape sluit. Zonder dit was de lijst alleen met de muis te
  // gebruiken en kon je met Tab ongemerkt de pagina erachter in lopen.
  useEffect(() => {
    if (!isOpen) return
    const bijToets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (zichtbaar.length === 0) return
        e.preventDefault()
        setActief((huidig) => {
          const richting = e.key === 'ArrowDown' ? 1 : -1
          return (huidig + richting + zichtbaar.length) % zichtbaar.length
        })
        return
      }
      if (e.key === 'Enter') {
        const keuze = zichtbaar[actief]
        if (keuze) {
          e.preventDefault()
          open(keuze)
        }
        return
      }
      if (e.key !== 'Tab') return
      const paneel = paneelRef.current
      if (!paneel) return
      const focusbaar = paneel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusbaar.length === 0) return
      const eerste = focusbaar[0]
      const laatste = focusbaar[focusbaar.length - 1]
      if (e.shiftKey && document.activeElement === eerste) {
        e.preventDefault()
        laatste.focus()
      } else if (!e.shiftKey && document.activeElement === laatste) {
        e.preventDefault()
        eerste.focus()
      }
    }
    window.addEventListener('keydown', bijToets)
    return () => window.removeEventListener('keydown', bijToets)
  }, [isOpen, onClose, zichtbaar, actief, open])

  // De gemarkeerde regel in beeld houden bij pijltjesgebruik.
  useEffect(() => {
    const regel = lijstRef.current?.children[actief] as HTMLElement | undefined
    regel?.scrollIntoView({ block: 'nearest' })
  }, [actief])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 md:pt-32 animate-fadeIn">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={paneelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('emptyTitle')}
        className="relative mx-3 flex max-h-[82vh] w-full max-w-4xl flex-col border-4 border-black bg-white shadow-2xl md:mx-4"
      >
        {/* Zoekveld */}
        <div className="border-b-4 border-black p-4 md:p-8">
          <div className="flex items-center gap-3 md:gap-4">
            <SearchIcon className="h-6 w-6 flex-shrink-0 md:h-8 md:w-8" strokeWidth={2.5} aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              // 16px of groter, anders zoomt Safari op iPhone in zodra je het
              // veld aanraakt en staat de halve winkel buiten beeld.
              className="min-w-0 flex-1 bg-transparent text-xl font-bold placeholder:text-gray-400 focus:outline-none md:text-3xl [&::-webkit-search-cancel-button]:appearance-none"
            />
            <button
              onClick={onClose}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center transition-colors hover:bg-gray-100"
              aria-label={t('closeLabel')}
            >
              <X className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Resultaten */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div aria-live="polite" className="sr-only">
            {query.trim()
              ? resultaten.length > 0
                ? t('resultCount', { count: resultaten.length })
                : t('noResults', { query })
              : ''}
          </div>

          {laden && index.length === 0 && (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
            </div>
          )}

          {!laden && query.trim() && resultaten.length === 0 && (
            <div className="py-10 text-center">
              <SearchIcon className="mx-auto mb-4 h-14 w-14 text-gray-300" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mb-2 text-xl font-bold text-gray-800">{t('noResults', { query })}</h3>
              <p className="mb-6 text-gray-600">{t('tryAgain')}</p>
              {suggesties.length > 0 && (
                <p className="text-sm font-bold uppercase tracking-wider text-gray-500">
                  {t('alsoAvailable')}
                </p>
              )}
            </div>
          )}

          {zichtbaar.length > 0 && (
            <>
              {!query.trim() && (
                <h3 className="mb-3 font-display text-base uppercase tracking-wide text-gray-500">
                  {t('popular')}
                </h3>
              )}
              <ul ref={lijstRef} className="space-y-3">
                {zichtbaar.map((product, i) => (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.slug}`}
                      onClick={onClose}
                      onMouseEnter={() => setActief(i)}
                      className={`group flex items-center gap-3 border-2 p-3 transition-all md:gap-4 md:p-4 ${
                        i === actief ? 'border-black bg-gray-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="relative h-16 w-16 flex-shrink-0 border-2 border-black bg-gray-100 md:h-20 md:w-20">
                        <Image
                          src={product.afbeelding || '/placeholder-product.svg'}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-base font-bold transition-colors group-hover:text-brand-primary md:text-lg">
                          {naamVan(product)}
                        </h4>
                        {categorieVan(product) && (
                          <p className="truncate text-sm text-gray-600">{categorieVan(product)}</p>
                        )}
                        {product.kleuren.length > 0 && (
                          <p className="truncate text-xs uppercase tracking-wider text-gray-500">
                            {product.kleuren.join(' · ')}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p className="text-lg font-bold text-brand-primary md:text-xl">
                          {formatPrice(product.sale_price ?? product.base_price, locale)}
                        </p>
                        {product.sale_price != null && product.sale_price < product.base_price && (
                          <p className="text-sm text-gray-400 line-through">
                            {formatPrice(product.base_price, locale)}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Voetregel met de toetsen. Op mobiel heeft niemand een Escape-toets,
            dus daar tonen we alleen het aantal. */}
        <div className="flex items-center justify-between gap-3 border-t-2 border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 md:px-8">
          <span className="hidden items-center gap-2 md:flex">
            <kbd className="rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs">↑</kbd>
            <kbd className="rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs">↓</kbd>
            {t('navigateHint')}
            <kbd className="ml-2 inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs">
              <CornerDownLeft size={11} aria-hidden="true" />
            </kbd>
            {t('openHint')}
            <kbd className="ml-2 rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs">ESC</kbd>
            {t('closeHint')}
          </span>
          {query.trim() && resultaten.length > 0 && (
            <span className="text-gray-500">{t('resultCount', { count: resultaten.length })}</span>
          )}
        </div>
      </div>
    </div>
  )
}
