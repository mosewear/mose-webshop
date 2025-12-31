'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // TODO: Send email via API
    // For now, simulate submission
    setTimeout(() => {
      setSubmitted(true)
      setLoading(false)
      setForm({ name: '', email: '', subject: '', message: '' })
      setTimeout(() => setSubmitted(false), 5000)
    }, 1000)
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-display mb-6">CONTACT</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Vragen over je bestelling, product of iets anders? We helpen je graag.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-white border-2 border-black p-6 md:p-8">
            <h2 className="text-2xl font-display mb-6">STUUR EEN BERICHT</h2>
            
            {submitted && (
              <div className="mb-6 p-4 bg-green-50 border-2 border-green-600 text-green-800">
                <strong>Bedankt!</strong> We hebben je bericht ontvangen en nemen zo snel mogelijk contact op.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-bold mb-2">
                  Naam *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="Je naam"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-bold mb-2">
                  E-mail *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="jouw@email.nl"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-bold mb-2">
                  Onderwerp *
                </label>
                <select
                  id="subject"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                >
                  <option value="">Kies een onderwerp</option>
                  <option value="order">Vraag over mijn bestelling</option>
                  <option value="product">Vraag over een product</option>
                  <option value="return">Retour of ruil</option>
                  <option value="other">Iets anders</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-bold mb-2">
                  Bericht *
                </label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-none"
                  placeholder="Vertel ons hoe we je kunnen helpen..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'VERSTUREN...' : 'VERSTUUR BERICHT'}
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            {/* Email */}
            <div className="bg-gray-50 border-2 border-gray-300 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-primary text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">E-mail</h3>
                  <a href="mailto:info@mosewear.com" className="text-brand-primary hover:underline">
                    info@mosewear.com
                  </a>
                  <p className="text-sm text-gray-600 mt-2">
                    We reageren binnen 24 uur op werkdagen
                  </p>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-gray-50 border-2 border-gray-300 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-primary text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">WhatsApp</h3>
                  <a href="https://wa.me/31612345678" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                    +31 6 12345678
                  </a>
                  <p className="text-sm text-gray-600 mt-2">
                    Snel en direct antwoord op je vragen
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-gray-50 border-2 border-gray-300 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-primary text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Locatie</h3>
                  <p className="text-gray-700">
                    MOSE Headquarters<br />
                    Groningen, Nederland
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Geen fysieke winkel, alleen online
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="bg-brand-primary text-white p-6 border-2 border-brand-primary">
              <h3 className="font-bold text-lg mb-2">Veelgestelde vragen?</h3>
              <p className="text-sm mb-4 opacity-90">
                Check eerst onze FAQ. Misschien staat je antwoord er al!
              </p>
              <Link
                href="/algemene-voorwaarden"
                className="inline-block px-6 py-3 bg-white text-brand-primary font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors text-sm"
              >
                Naar Voorwaarden
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
