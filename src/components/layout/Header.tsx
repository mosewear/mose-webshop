'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/store/cart'
import { useCartDrawer } from '@/store/cartDrawer'
import CartDrawer from '@/components/CartDrawer'
import { ChevronRight, Search, User, Heart } from 'lucide-react'

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [mounted, setMounted] = useState(false)
  const itemCount = useCart((state) => state.getItemCount())
  const { isOpen, openDrawer, closeDrawer } = useCartDrawer()

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
        className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md py-4 transition-shadow duration-300"
      >
        {/* Scroll Progress Indicator */}
        <div 
          className="absolute bottom-0 left-0 h-[3px] bg-brand-primary transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
        
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
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
              <Link href="/shop" className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                Shop
              </Link>
              <Link href="/lookbook" className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                Lookbook
              </Link>
              <Link href="/over-mose" className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                Over MOSE
              </Link>
              <Link href="/contact" className="font-bold text-sm uppercase tracking-wider hover:text-brand-primary transition-colors">
                Contact
              </Link>
            </nav>

            {/* Icons */}
            <div className="flex items-center space-x-4">
              {/* Desktop Icons - All visible */}
              <button className="hidden md:block p-2 hover:text-brand-primary transition-colors" aria-label="Zoeken">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              <Link href="/account" className="hidden md:block p-2 hover:text-brand-primary transition-colors" aria-label="Account">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>

              <Link href="/wishlist" className="hidden md:block p-2 hover:text-brand-primary transition-colors" aria-label="Wishlist">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </Link>

              {/* Cart - Always visible (desktop + mobile) */}
              <button
                onClick={openDrawer}
                className="relative p-2 hover:text-brand-primary transition-colors"
                aria-label="Winkelwagen"
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
                aria-label="Menu"
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
          {/* Search - Minimal Line */}
          <button 
            className="flex items-center gap-3 text-xl font-bold py-4 border-b-2 border-black hover:bg-gray-50 transition-colors group"
            onClick={() => {
              setIsMobileMenuOpen(false)
              // TODO: Open search modal/functionality
            }}
          >
            <Search className="w-6 h-6" />
            <span>ZOEKEN</span>
          </button>

          {/* Navigation Links - Minimal with Arrows */}
          <Link
            href="/shop"
            className="flex items-center justify-between py-5 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-all group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span>SHOP</span>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>
          <Link
            href="/lookbook"
            className="flex items-center justify-between py-5 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-all group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span>LOOKBOOK</span>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>
          <Link
            href="/over-mose"
            className="flex items-center justify-between py-5 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-all group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span>OVER MOSE</span>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>
          <Link
            href="/contact"
            className="flex items-center justify-between py-5 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-all group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span>CONTACT</span>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>

          {/* Account - Prominent Border-4 Box */}
          <div className="mt-8">
            <Link
              href="/account"
              className="flex items-center gap-3 py-4 px-6 text-lg font-bold border-4 border-black bg-white hover:bg-black hover:text-white transition-all group"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User className="w-6 h-6" />
              <span className="uppercase tracking-wide">MIJN ACCOUNT</span>
            </Link>
          </div>

          {/* Wishlist - Subtle Line */}
          <Link
            href="/wishlist"
            className="flex items-center gap-3 py-4 text-lg font-semibold border-b-2 border-gray-200 hover:text-brand-primary transition-colors mt-6"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Heart className="w-5 h-5" />
            <span>Wishlist</span>
          </Link>
        </nav>
      </div>

      {/* Spacer */}
      <div className="h-20" />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isOpen} onClose={closeDrawer} />
    </>
  )
}

