'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const products = [
  {
    name: 'MOSE Basic Hoodie',
    slug: 'mose-classic-hoodie-zwart',
    price: '€79,99',
    image: '/hoodieblack.png',
    badge: 'BESTSELLER',
    badgeColor: 'bg-brand-primary',
  },
  {
    name: 'MOSE Basic Tee',
    slug: 'mose-essential-tee-zwart',
    price: '€34,99',
    image: '/blacktee.png',
    badge: 'NEW',
    badgeColor: 'bg-black',
  },
  {
    name: 'MOSE Snapback',
    slug: 'mose-classic-cap-zwart',
    price: '€29,99',
    image: '/hoodie_cap.png',
    badge: 'TRENDING',
    badgeColor: 'bg-brand-primary',
  },
]

export default function MobileProductCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Update active index based on scroll position
  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft
      const cardWidth = carousel.offsetWidth * 0.80 + 16 // 80vw + gap-4
      const index = Math.round(scrollLeft / cardWidth)
      setActiveIndex(Math.max(0, Math.min(index, products.length - 1)))
    }

    carousel.addEventListener('scroll', handleScroll)
    return () => carousel.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to specific index when dot is clicked
  const scrollToIndex = (index: number) => {
    const carousel = carouselRef.current
    if (!carousel) return

    const cardWidth = carousel.offsetWidth * 0.80 + 16 // 80vw + gap-4
    carousel.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth',
    })
  }

  return (
    <div className="md:hidden">
      {/* Carousel Container */}
      <div
        ref={carouselRef}
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 px-4 pb-4 scroll-smooth"
      >
        {products.map((product, idx) => (
          <Link
            key={idx}
            href={`/product/${product.slug}`}
            className="flex-none w-[80vw] min-w-[280px] snap-start"
          >
            <div className="bg-white overflow-hidden shadow-md border-2 border-black h-full">
              {/* Product Image Container */}
              <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover object-center"
                />
                
                {/* Badge */}
                <div className={`absolute top-2 left-2 ${product.badgeColor} text-white px-2 py-1 text-xs font-bold uppercase tracking-wider shadow-lg`}>
                  {product.badge}
                </div>
                
                {/* Wishlist Button - Always visible on mobile */}
                <button 
                  className="absolute top-2 right-2 w-11 h-11 bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:bg-brand-primary hover:text-white active:scale-90 border-2 border-black"
                  onClick={(e) => {
                    e.preventDefault()
                    // Wishlist logic here
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
              
              {/* Product Info */}
              <div className="p-4 text-center">
                <h3 className="font-bold text-base mb-2 uppercase tracking-wide">
                  {product.name}
                </h3>
                <p className="text-2xl font-bold text-brand-primary mb-3">{product.price}</p>
                
                {/* Add to Cart Button */}
                <button 
                  className="w-full bg-brand-primary text-white font-bold py-3 px-4 uppercase tracking-wider text-xs hover:bg-brand-primary-hover transition-colors active:scale-95"
                  onClick={(e) => {
                    e.preventDefault()
                    // Add to cart logic
                  }}
                >
                  In Winkelmand
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Progress Dots - Square */}
      <div className="flex justify-center items-center gap-2 mt-6">
        {products.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollToIndex(idx)}
            className={`transition-all duration-300 ${
              idx === activeIndex 
                ? 'w-8 h-2 bg-brand-primary' 
                : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Ga naar slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

