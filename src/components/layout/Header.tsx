'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/store/cart'

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const itemCount = useCart((state) => state.getItemCount())

  useEffect(() => {
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white shadow-md py-4'
            : 'bg-white/95 backdrop-blur-sm py-6'
        }`}
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
              <button className="p-2 hover:text-brand-primary transition-colors" aria-label="Zoeken">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              <Link href="/account" className="p-2 hover:text-brand-primary transition-colors" aria-label="Account">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>

              <Link href="/cart" className="relative p-2 hover:text-brand-primary transition-colors" aria-label="Winkelwagen">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Toggle */}
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
          <Link
            href="/shop"
            className="py-6 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            SHOP
          </Link>
          <Link
            href="/lookbook"
            className="py-6 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            LOOKBOOK
          </Link>
          <Link
            href="/over-mose"
            className="py-6 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            OVER MOSE
          </Link>
          <Link
            href="/contact"
            className="py-6 text-2xl font-display border-b-2 border-gray-200 hover:text-brand-primary transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            CONTACT
          </Link>
        </nav>
      </div>

      {/* Spacer */}
      <div className={isScrolled ? 'h-20' : 'h-24'} />
    </>
  )
}

