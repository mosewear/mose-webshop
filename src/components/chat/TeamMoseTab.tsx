'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Mail, Clock } from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'

export default function TeamMoseTab() {
  const [contactPhone, setContactPhone] = useState('+31 50 211 1931')
  const [contactEmail, setContactEmail] = useState('info@mosewear.com')

  useEffect(() => {
    getSiteSettings().then((settings) => {
      setContactPhone(settings.contact_phone)
      setContactEmail(settings.contact_email)
    })
  }, [])

  const whatsappUrl = `https://wa.me/${contactPhone.replace(/\D/g, '')}`

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
      {/* Header */}
      <div className="text-center">
        <h3 className="font-display text-2xl uppercase tracking-wide mb-2">
          Praat met Team MOSE
        </h3>
        <p className="text-gray-600">
          Voor persoonlijke hulp, complexe vragen of gewoon een praatje
        </p>
      </div>

      {/* WhatsApp */}
      <div className="bg-white border-2 border-black p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-primary border-2 border-black flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h4 className="font-display text-lg uppercase tracking-wide">WhatsApp</h4>
            <p className="text-sm text-gray-600">Snelste manier om contact op te nemen</p>
          </div>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 px-4 bg-brand-primary text-white border-2 border-black hover:bg-brand-primary-hover transition-colors text-center font-display uppercase tracking-wide"
        >
          Open WhatsApp
        </a>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" strokeWidth={2} />
          <span>Online: ma-vr 10:00-18:00</span>
        </div>
      </div>

      {/* Email */}
      <div className="bg-white border-2 border-black p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 border-2 border-black flex items-center justify-center">
            <Mail className="w-6 h-6 text-gray-700" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h4 className="font-display text-lg uppercase tracking-wide">Email</h4>
            <p className="text-sm text-gray-600">Voor minder urgente vragen</p>
          </div>
        </div>

        <a
          href={`mailto:${contactEmail}`}
          className="block w-full py-3 px-4 bg-gray-100 text-black border-2 border-black hover:bg-gray-200 transition-colors text-center font-display uppercase tracking-wide"
        >
          Stuur email
        </a>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" strokeWidth={2} />
          <span>Response binnen 24 uur</span>
        </div>
      </div>

      {/* Info */}
      <div className="text-center text-sm text-gray-600 pt-4 border-t-2 border-gray-200">
        <p>
          Het Team MOSE team helpt je graag met:
        </p>
        <ul className="mt-2 space-y-1 text-left max-w-xs mx-auto">
          <li>• Beschadigde of verkeerde orders</li>
          <li>• Complexe retour situaties</li>
          <li>• Custom requests</li>
          <li>• Order status & tracking</li>
          <li>• Andere vragen</li>
        </ul>
      </div>
    </div>
  )
}

