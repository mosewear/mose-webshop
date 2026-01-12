'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Instagram, Facebook } from 'lucide-react'
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
            {/* Social Media Icons */}
            <div className="flex gap-4">
              <a 
                href="https://instagram.com/mosewear.nl" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 border-2 border-white flex items-center justify-center hover:bg-brand-primary hover:border-brand-primary transition-all duration-300 group"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </a>
              <a 
                href="https://www.facebook.com/mosewearcom" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 border-2 border-white flex items-center justify-center hover:bg-brand-primary hover:border-brand-primary transition-all duration-300 group"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 group-hover:scale-110 transition-transform" />
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

