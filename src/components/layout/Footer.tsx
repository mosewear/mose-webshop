'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getSiteSettings } from '@/lib/settings'

export function Footer() {
  const [settings, setSettings] = useState({
    contact_address: 'Helper Brink 27a, 9722 EG Groningen',
    contact_phone: '+31 50 211 1931',
    contact_email: 'info@mosewear.nl',
    tax_rate: 21,
    return_days: 14,
  })

  useEffect(() => {
    getSiteSettings().then((s) => {
      setSettings({
        contact_address: s.contact_address,
        contact_phone: s.contact_phone,
        contact_email: s.contact_email,
        tax_rate: s.tax_rate,
        return_days: s.return_days,
      })
    })
  }, [])

  // Parse address (split on comma for multi-line display)
  const addressLines = settings.contact_address.split(',').map(line => line.trim())

  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* MOSE Info */}
          <div>
            <Image
              src="/logomose.png"
              alt="MOSE"
              width={120}
              height={40}
              className="h-8 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-gray-400 mb-4">
              Kleding zonder poespas. Lokaal gemaakt. Gebouwd om lang mee te gaan.
            </p>
            <div className="space-y-2 text-sm text-gray-400 mb-4">
              {addressLines.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
              <p>
                <a href={`tel:${settings.contact_phone.replace(/\s/g, '')}`} className="hover:text-white transition-colors">
                  {settings.contact_phone}
                </a>
              </p>
              <p>
                <a href={`mailto:${settings.contact_email}`} className="hover:text-white transition-colors">
                  {settings.contact_email}
                </a>
              </p>
            </div>
            <div className="flex space-x-4">
              <a href="https://instagram.com/mosewear.nl" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-display text-lg mb-4 uppercase">Shop</h4>
            <ul className="space-y-2">
              <li><Link href="/shop?category=hoodies" className="text-gray-400 hover:text-white transition-colors">Hoodies</Link></li>
              <li><Link href="/shop?category=t-shirts" className="text-gray-400 hover:text-white transition-colors">T-Shirts</Link></li>
              <li><Link href="/shop?category=caps" className="text-gray-400 hover:text-white transition-colors">Caps</Link></li>
              <li><Link href="/shop" className="text-gray-400 hover:text-white transition-colors">Alle Producten</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-display text-lg mb-4 uppercase">Info</h4>
            <ul className="space-y-2">
              <li><Link href="/over-mose" className="text-gray-400 hover:text-white transition-colors">Over MOSE</Link></li>
              <li><Link href="/lookbook" className="text-gray-400 hover:text-white transition-colors">Lookbook</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/verzending" className="text-gray-400 hover:text-white transition-colors">Verzending & Retour</Link></li>
            </ul>
          </div>

          {/* Service */}
          <div>
            <h4 className="font-display text-lg mb-4 uppercase">Service</h4>
            <ul className="space-y-2">
              <li><Link href="/account" className="text-gray-400 hover:text-white transition-colors">Mijn Account</Link></li>
              <li><Link href="/cart" className="text-gray-400 hover:text-white transition-colors">Winkelwagen</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/algemene-voorwaarden" className="text-gray-400 hover:text-white transition-colors">Algemene Voorwaarden</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} MOSE. Alle rechten voorbehouden.
          </p>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center text-sm text-gray-400">
            <p>Alle prijzen incl. {settings.tax_rate}% BTW</p>
            <span className="hidden md:inline">•</span>
            <p>Gemaakt met ❤️ in Groningen</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

