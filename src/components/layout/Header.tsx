'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/store/cart'
import { useCartDrawer } from '@/store/cartDrawer'
import CartDrawer from '@/components/CartDrawer'
import SearchOverlay from '@/components/SearchOverlay'
import LanguageSelector from '@/components/LanguageSelector'
import { ChevronRight, User, Heart } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

export function Header() {
  const t = useTranslations('common')
  const locale = useLocale()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const itemCount = useCart((state) => state.getItemCount())
  const { isOpen, openDrawer, closeDrawer } = useCartDrawer()

  // Helper to create locale-aware links
  const localeLink = (path: string) => `/${locale}${path === '/' ? '' : path}`

  useEffect(() => {
    setMounted(true)
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
      
      // Calculate scroll progress
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      const scrollableHeight = documentHeight - windowHeight
      const progress = (scrollTop / scrollableHeight) * 100
      setScrollProgress(Math.min(progress, 100))
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Desktop Header */}
      <header
        className="fixed left-0 right-0 z-40 bg-white shadow-md py-4 transition-shadow duration-300"
        style={{ top: 'var(--announcement-banner-height, 0px)' }}
      >
        {/* Scroll Progress Indicator */}
        <div 
          className="absolute bottom-0 left-0 h-[3px] bg-brand-primary transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
        
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              href={localeLink('/')}
              className="flex items-center hover:opacity-80 transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image
                src="/logomose.png"
                alt="MOSE"
                width={180}
                height={60}
                className="h-12 md:h-14 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href={localeLink('/shop')} className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                {t('shop')}
              </Link>
              <Link href={localeLink('/lookbook')} className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                {t('lookbook')}
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
                className="hidden md:block p-2 hover:text-brand-primary transition-colors" 
                aria-label={t('search')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              <Link href={localeLink('/account')} className="hidden md:block p-2 hover:text-brand-primary transition-colors" aria-label={t('account')}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>

              <Link href={localeLink('/wishlist')} className="hidden md:block p-2 hover:text-brand-primary transition-colors" aria-label={t('wishlist')}>
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
              <button
                className="md:hidden p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={t('menu')}
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

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 bg-white transform transition-transform duration-300 md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav className="flex flex-col h-full pt-24 px-8">
          {/* Navigation Links - Green Arrows! */}
          <Link
            href={localeLink('/shop')}
            className="flex items-center justify-between py-5 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-all group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="uppercase">{t('shop')}</span>
            <ChevronRight className="w-6 h-6 text-brand-primary group-hover:translate-x-2 transition-transform" />
          </Link>
          <Link
            href={localeLink('/lookbook')}
            className="flex items-center justify-between py-5 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-all group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="uppercase">{t('lookbook')}</span>
            <ChevronRight className="w-6 h-6 text-brand-primary group-hover:translate-x-2 transition-transform" />
          </Link>
          <Link
            href={localeLink('/over-mose')}
            className="flex items-center justify-between py-5 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-all group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="uppercase">{t('about')}</span>
            <ChevronRight className="w-6 h-6 text-brand-primary group-hover:translate-x-2 transition-transform" />
          </Link>
          <Link
            href={localeLink('/contact')}
            className="flex items-center justify-between py-5 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-all group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="uppercase">{t('contact')}</span>
            <ChevronRight className="w-6 h-6 text-brand-primary group-hover:translate-x-2 transition-transform" />
          </Link>

          {/* Account - Green Box! */}
          <div className="mt-8">
            <Link
              href={localeLink('/account')}
              className="flex items-center gap-3 py-4 px-6 text-lg font-bold border-2 border-brand-primary bg-brand-primary text-white hover:bg-brand-primary-hover transition-all group"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User className="w-6 h-6" />
              <span className="uppercase tracking-wide">{t('account')}</span>
            </Link>
          </div>

          {/* Wishlist - Green Heart */}
          <Link
            href={localeLink('/wishlist')}
            className="flex items-center gap-3 py-4 text-lg font-semibold border-b-2 border-gray-200 hover:text-brand-primary transition-colors mt-6"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Heart className="w-5 h-5 text-brand-primary" />
            <span>{t('wishlist')}</span>
          </Link>
        </nav>
      </div>

      {/* Spacer */}
      <div className="h-20" />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isOpen} onClose={closeDrawer} />

      {/* Search Overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

