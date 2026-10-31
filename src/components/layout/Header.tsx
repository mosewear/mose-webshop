'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/store/cart'
import { useCartDrawer } from '@/store/cartDrawer'
import CartDrawer from '@/components/CartDrawer'
import SearchOverlay from '@/components/SearchOverlay'
import LanguageSelector from '@/components/LanguageSelector'
import MobileMenu from '@/components/layout/MobileMenu'
import { useTranslations, useLocale } from 'next-intl'

export function Header() {
  const t = useTranslations('common')
  const locale = useLocale()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // De voortgangsbalk wordt rechtstreeks op het DOM-element geschreven in
  // plaats van via React-state. Een setState per scroll-event hertekende de
  // hele Header inclusief MobileMenu, CartDrawer en SearchOverlay, puur om de
  // breedte van een streepje van 3px bij te werken.
  const progressRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const itemCount = useCart((state) => state.getItemCount())
  const { isOpen, openDrawer, closeDrawer } = useCartDrawer()

  // Helper to create locale-aware links
  const localeLink = (path: string) => `/${locale}${path === '/' ? '' : path}`

  useEffect(() => {
    setMounted(true)

    // scrollHeight uitlezen forceert een layout. Dat gebeurde eerder bij elk
    // scroll-event. Nu meten we alleen wanneer de paginahoogte echt verandert.
    // Eén meting bij mount volstaat niet: de Header blijft gemount over
    // client-side navigaties heen, en content laadt na (Instagram-marquee,
    // gerelateerde producten). Zonder de ResizeObserver hieronder zou de balk
    // na een navigatie met de hoogte van de vórige pagina rekenen en dus
    // vollopen op 30 procent, of nooit 100 halen.
    let scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
    let frame = 0

    const render = () => {
      frame = 0
      if (!progressRef.current) return
      const progress = scrollableHeight > 0
        ? Math.min((window.scrollY / scrollableHeight) * 100, 100)
        : 0
      progressRef.current.style.width = `${progress}%`
    }

    const handleScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(render)
    }

    const remeasure = () => {
      scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
      handleScroll()
    }

    render()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', remeasure, { passive: true })

    const heightObserver = new ResizeObserver(remeasure)
    heightObserver.observe(document.body)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', remeasure)
      heightObserver.disconnect()
    }
  }, [])

  return (
    <>
      {/* Desktop Header */}
      <header
        className="fixed left-0 right-0 z-40 bg-white border-b-2 border-gray-200 py-4 transition-colors duration-300"
        style={{ top: 'var(--announcement-banner-height, 0px)' }}
      >
        {/* Scroll Progress Indicator */}
        <div
          ref={progressRef}
          className="absolute bottom-0 left-0 h-[3px] w-0 bg-brand-primary"
          aria-hidden
        />
        
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              href={localeLink('/')}
              className="flex lg:shrink-0 items-center hover:opacity-80 transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image
                src="/logomose.png"
                alt="MOSE"
                width={180}
                height={60}
                className="h-12 lg:h-14 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-5 xl:space-x-8">
              <Link href={localeLink('/shop')} className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                {t('shop')}
              </Link>
              <Link href={localeLink('/lookbook')} className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                {t('lookbook')}
              </Link>
              <Link href={localeLink('/blog')} className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                {t('blog')}
              </Link>
              <Link href={localeLink('/over-mose')} className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                {t('about')}
              </Link>
              <Link href={localeLink('/contact')} className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                {t('contact')}
              </Link>
            </nav>

            {/* Icons */}
            <div className="flex items-center space-x-4">
              {/* Language Selector - Left of other icons */}
              <LanguageSelector />
              
              {/* Desktop Icons - All visible */}
              <button 
                onClick={() => setSearchOpen(true)}
                className="hidden lg:block p-2 hover:text-brand-primary transition-colors" 
                aria-label={t('search')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              <Link href={localeLink('/account')} className="hidden lg:block p-2 hover:text-brand-primary transition-colors" aria-label={t('account')}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>

              <Link href={localeLink('/wishlist')} className="hidden lg:block p-2 hover:text-brand-primary transition-colors" aria-label={t('wishlist')}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </Link>

              {/* Cart - Always visible (desktop + mobile) */}
              <button
                onClick={openDrawer}
                className="relative p-2 hover:text-brand-primary transition-colors"
                aria-label={t('cart')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Toggle - Always visible on mobile */}
              {/* 40x40 was te klein (de norm is 44) en een schermlezer hoorde
                  niet of het menu open of dicht stond. */}
              <button
                className="lg:hidden flex h-11 w-11 items-center justify-center"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={t('menu')}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobiel-menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu — brutalist statement-drawer met eigen close-X,
          backdrop-tap-to-close, ESC, scroll-lock en focus-management.
          Zie src/components/layout/MobileMenu.tsx voor de volledige
          UX-uitleg per sectie. */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isOpen} onClose={closeDrawer} />

      {/* Search Overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

